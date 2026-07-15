<?php

namespace App\Modules\Loyalty\Application\Services;

use App\Modules\CRM\Domain\Models\Customer;
use App\Modules\Loyalty\Domain\Models\LoyaltyAccount;
use App\Modules\Loyalty\Domain\Models\LoyaltyPackage;
use App\Modules\Loyalty\Domain\Models\LoyaltyPackageProgress;
use App\Modules\Loyalty\Domain\Models\LoyaltyReferral;
use App\Modules\Loyalty\Domain\Models\LoyaltySettings;
use App\Modules\Orders\Domain\Models\Order;
use App\Modules\Pricing\Application\Services\AuditLogService;
use App\Modules\Pricing\Application\Services\PlanLimitService;
use App\Shared\Auth\PermissionService;
use App\Shared\Entitlements\FeatureAccessService;
use App\Shared\Tenancy\TenantContext;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class LoyaltyProgramService
{
    public const FEATURE_KEY = 'loyalty_system';

    public function __construct(
        private TenantContext $tenantContext,
        private PermissionService $permissionService,
        private FeatureAccessService $featureAccessService,
        private PlanLimitService $planLimitService,
        private LoyaltyNotificationService $notificationService,
        private AuditLogService $auditLogService,
        private LoyaltyService $loyaltyService,
    ) {}

    public function dashboard(array $permissions): array
    {
        $this->authorizeManage($permissions);
        $this->featureAccessService->assertAccess(self::FEATURE_KEY);
        $tenantId = $this->tenantContext->id();
        $settings = $this->settings();

        $accounts = LoyaltyAccount::query()->get();
        $active = $accounts->where('membership_status', 'active')->count();
        $eligible = $accounts->where('membership_status', 'eligible')->count();

        return [
            'settings' => $settings,
            'packages' => LoyaltyPackage::query()->orderBy('sort_order')->orderBy('created_at')->get(),
            'analytics' => [
                'members_active' => $active,
                'members_eligible' => $eligible,
                'members_total' => $accounts->count(),
                'points_outstanding' => (int) $accounts->sum('points_balance'),
                'stamps_outstanding' => (int) $accounts->sum('stamps_balance'),
                'referrals_credited' => LoyaltyReferral::query()->where('status', 'credited')->count(),
                'packages_active' => LoyaltyPackage::query()->where('is_active', true)->count(),
                'free_until' => $this->featureAccessService->sharedFreeTrialEndsAt()?->toDateString(),
            ],
            'members' => LoyaltyAccount::query()
                ->orderByDesc('enrolled_at')
                ->orderByDesc('created_at')
                ->limit(50)
                ->get()
                ->map(function (LoyaltyAccount $account) {
                    $customer = Customer::withoutGlobalScopes()->find($account->customer_id);

                    return [
                        'account' => $account,
                        'customer' => $customer ? [
                            'id' => $customer->id,
                            'name' => $customer->name,
                            'phone' => $customer->phone,
                            'email' => $customer->email,
                        ] : null,
                    ];
                }),
        ];
    }

    public function updateSettings(array $data, array $permissions): LoyaltySettings
    {
        $this->authorizeManage($permissions);
        $this->featureAccessService->assertAccess(self::FEATURE_KEY);

        $settings = $this->settings();
        $settings->update([
            'enrollments_paused' => array_key_exists('enrollments_paused', $data)
                ? (bool) $data['enrollments_paused']
                : $settings->enrollments_paused,
            'referral_stamp_credit' => $data['referral_stamp_credit'] ?? $settings->referral_stamp_credit,
            'referral_points_credit' => $data['referral_points_credit'] ?? $settings->referral_points_credit,
            'near_goal_threshold_percent' => $data['near_goal_threshold_percent'] ?? $settings->near_goal_threshold_percent,
        ]);

        $this->auditLogService->log(
            'loyalty.settings_updated',
            $this->tenantContext->id(),
            $this->tenantContext->user()?->id,
            'loyalty_settings',
            $settings->id,
            ['enrollments_paused' => $settings->enrollments_paused],
        );

        return $settings->fresh();
    }

    public function createPackage(array $data, array $permissions): LoyaltyPackage
    {
        $this->authorizeManage($permissions);
        $this->featureAccessService->assertAccess(self::FEATURE_KEY);
        $this->assertPackagePayload($data);

        $package = LoyaltyPackage::create([
            'tenant_id' => $this->tenantContext->id(),
            'name' => $data['name'],
            'description' => $data['description'] ?? null,
            'package_type' => $data['package_type'],
            'goal_value' => (int) $data['goal_value'],
            'reward_type' => $data['reward_type'],
            'reward_value' => $data['reward_value'] ?? null,
            'reward_label' => $data['reward_label'],
            'is_active' => array_key_exists('is_active', $data) ? (bool) $data['is_active'] : true,
            'sort_order' => (int) ($data['sort_order'] ?? 0),
        ]);

        $this->auditLogService->log(
            'loyalty.package_created',
            $this->tenantContext->id(),
            $this->tenantContext->user()?->id,
            'loyalty_package',
            $package->id,
            ['name' => $package->name],
        );

        return $package;
    }

    public function updatePackage(string $id, array $data, array $permissions): LoyaltyPackage
    {
        $this->authorizeManage($permissions);
        $this->featureAccessService->assertAccess(self::FEATURE_KEY);

        $package = LoyaltyPackage::findOrFail($id);
        if (isset($data['package_type']) || isset($data['goal_value']) || isset($data['reward_type'])) {
            $this->assertPackagePayload(array_merge($package->toArray(), $data));
        }

        $package->update([
            'name' => $data['name'] ?? $package->name,
            'description' => array_key_exists('description', $data) ? $data['description'] : $package->description,
            'package_type' => $data['package_type'] ?? $package->package_type,
            'goal_value' => isset($data['goal_value']) ? (int) $data['goal_value'] : $package->goal_value,
            'reward_type' => $data['reward_type'] ?? $package->reward_type,
            'reward_value' => array_key_exists('reward_value', $data) ? $data['reward_value'] : $package->reward_value,
            'reward_label' => $data['reward_label'] ?? $package->reward_label,
            'is_active' => array_key_exists('is_active', $data) ? (bool) $data['is_active'] : $package->is_active,
            'sort_order' => isset($data['sort_order']) ? (int) $data['sort_order'] : $package->sort_order,
        ]);

        return $package->fresh();
    }

    public function deletePackage(string $id, array $permissions): void
    {
        $this->authorizeManage($permissions);
        $this->featureAccessService->assertAccess(self::FEATURE_KEY);
        LoyaltyPackage::findOrFail($id)->delete();
    }

    public function notifyQualified(array $permissions, ?string $audience = 'eligible_or_active'): array
    {
        $this->authorizeManage($permissions);
        $this->featureAccessService->assertAccess(self::FEATURE_KEY);

        $tenantId = $this->tenantContext->id();
        $query = LoyaltyAccount::query()->whereIn('membership_status', ['eligible', 'active']);
        if ($audience === 'active') {
            $query->where('membership_status', 'active');
        } elseif ($audience === 'eligible') {
            $query->where('membership_status', 'eligible');
        }

        $summary = $this->notificationService->packagesSummary($tenantId);
        $title = 'You qualify for our loyalty rewards';
        $body = "Great news — you're part of our loyalty program.\n\n".$summary;
        $sent = 0;

        foreach ($query->get() as $account) {
            $customer = Customer::withoutGlobalScopes()->find($account->customer_id);
            if (! $customer) {
                continue;
            }
            $channels = $this->notificationService->notifyCustomer($tenantId, $customer, $title, $body);
            if ($channels['email'] || $channels['push'] || $channels['whatsapp']) {
                $sent++;
            }
        }

        $this->auditLogService->log(
            'loyalty.notified_qualified',
            $tenantId,
            $this->tenantContext->user()?->id,
            'loyalty_program',
            $tenantId,
            ['sent' => $sent, 'audience' => $audience],
        );

        return ['notified' => $sent];
    }

    public function customerSnapshot(string $customerId, string $phone): array
    {
        $this->featureAccessService->assertAccess(self::FEATURE_KEY);
        $customer = Customer::where('id', $customerId)->where('phone', $phone)->firstOrFail();
        $account = $this->loyaltyService->findOrCreateAccountRecord($customer->id);
        $completed = $this->completedOrderCount($customer->id);
        $settings = $this->settings();

        return [
            'loyalty' => $account,
            'completed_orders' => $completed,
            'can_opt_in' => $completed >= 1
                && $account->membership_status !== 'active'
                && ! $settings->enrollments_paused,
            'packages' => LoyaltyPackage::query()->where('is_active', true)->orderBy('sort_order')->get(),
            'progress' => LoyaltyPackageProgress::query()
                ->where('loyalty_account_id', $account->id)
                ->with('package')
                ->get(),
            'enrollments_paused' => $settings->enrollments_paused,
        ];
    }

    public function optIn(string $customerId, string $phone): LoyaltyAccount
    {
        $this->featureAccessService->assertAccess(self::FEATURE_KEY);
        $customer = Customer::where('id', $customerId)->where('phone', $phone)->firstOrFail();
        $completed = $this->completedOrderCount($customer->id);
        if ($completed < 1) {
            throw ValidationException::withMessages([
                'orders' => ['Complete at least one order before joining loyalty.'],
            ]);
        }

        return $this->enrollCustomer($customer, 'signup', true);
    }

    public function settings(): LoyaltySettings
    {
        $tenantId = $this->tenantContext->id();

        return LoyaltySettings::firstOrCreate(
            ['tenant_id' => $tenantId],
            [
                'enrollments_paused' => false,
                'referral_stamp_credit' => 1,
                'referral_points_credit' => 25,
                'near_goal_threshold_percent' => 80,
            ],
        );
    }

    public function completedOrderCount(string $customerId): int
    {
        return Order::withoutGlobalScopes()
            ->where('tenant_id', $this->tenantContext->id())
            ->where('customer_id', $customerId)
            ->where('status', 'completed')
            ->count();
    }

    /**
     * Auto-enroll at 2 completed orders; honor pause (no new enrollment).
     */
    public function evaluateEnrollmentAfterOrder(Customer $customer): ?LoyaltyAccount
    {
        if (! $this->featureAccessService->canAccess(self::FEATURE_KEY, $this->tenantContext->id())) {
            return null;
        }

        $completed = $this->completedOrderCount($customer->id);
        $account = $this->loyaltyService->findOrCreateAccountRecord($customer->id);

        if ($account->membership_status === 'active') {
            return $account;
        }

        if ($completed >= 2) {
            return $this->enrollCustomer($customer, 'auto', false);
        }

        if ($completed >= 1 && $account->membership_status === 'prospect') {
            $account->update(['membership_status' => 'eligible']);
        }

        return $account->fresh();
    }

    public function enrollCustomer(Customer $customer, string $source, bool $requireOpenEnrollments): LoyaltyAccount
    {
        $settings = $this->settings();
        $account = $this->loyaltyService->findOrCreateAccountRecord($customer->id);

        if ($account->membership_status === 'active') {
            if ($source === 'signup' && ! $account->opted_in_at) {
                $account->update(['opted_in_at' => now()]);
            }

            return $account->fresh();
        }

        // Pause new enrollments only — existing actives keep earning elsewhere.
        if ($settings->enrollments_paused) {
            if ($requireOpenEnrollments || $source === 'signup') {
                throw ValidationException::withMessages([
                    'loyalty' => ['This kitchen has paused new loyalty enrollments.'],
                ]);
            }
            $account->update(['membership_status' => 'eligible']);

            return $account->fresh();
        }

        $this->planLimitService->assertLoyaltyMemberLimit();

        $account->update([
            'membership_status' => 'active',
            'enrolled_at' => now(),
            'opted_in_at' => $source === 'signup' ? now() : $account->opted_in_at,
            'enrollment_source' => $source,
        ]);

        if (! $account->welcome_notified_at) {
            $summary = $this->notificationService->packagesSummary($this->tenantContext->id());
            $this->notificationService->notifyCustomer(
                $this->tenantContext->id(),
                $customer,
                'Welcome to '.$this->restaurantFallback().' loyalty',
                "You're now in our loyalty program.\n\n".$summary,
                ['event' => 'welcome'],
            );
            $account->update(['welcome_notified_at' => now()]);
        }

        return $account->fresh();
    }

    public function ensureReferralToken(string $referrerCustomerId): LoyaltyReferral
    {
        $existing = LoyaltyReferral::query()
            ->where('referrer_customer_id', $referrerCustomerId)
            ->where('status', 'open')
            ->whereNull('referred_customer_id')
            ->latest()
            ->first();

        if ($existing) {
            return $existing;
        }

        return LoyaltyReferral::create([
            'tenant_id' => $this->tenantContext->id(),
            'referrer_customer_id' => $referrerCustomerId,
            'token' => Str::lower(Str::random(24)),
            'status' => 'open',
        ]);
    }

    public function attributeReferral(string $token, Customer $referred): void
    {
        $referral = LoyaltyReferral::withoutGlobalScopes()
            ->where('tenant_id', $this->tenantContext->id())
            ->where('token', $token)
            ->first();

        if (! $referral || $referral->referrer_customer_id === $referred->id) {
            return;
        }

        // One referred customer can only credit once (any token from same kitchen).
        $already = LoyaltyReferral::withoutGlobalScopes()
            ->where('tenant_id', $this->tenantContext->id())
            ->where('referred_customer_id', $referred->id)
            ->whereIn('status', ['attributed', 'credited'])
            ->exists();

        if ($already) {
            return;
        }

        if ($referral->referred_customer_id && $referral->referred_customer_id !== $referred->id) {
            // Token already used by someone else — mint attribution on a copy
            LoyaltyReferral::create([
                'tenant_id' => $this->tenantContext->id(),
                'referrer_customer_id' => $referral->referrer_customer_id,
                'token' => $referral->token.'-'.Str::lower(Str::random(6)),
                'referred_customer_id' => $referred->id,
                'status' => 'attributed',
                'attributed_at' => now(),
            ]);
        } else {
            $referral->update([
                'referred_customer_id' => $referred->id,
                'status' => 'attributed',
                'attributed_at' => now(),
            ]);
        }

        if (! $referred->referred_by_customer_id) {
            $referred->update(['referred_by_customer_id' => $referral->referrer_customer_id]);
        }
    }

    public function creditReferralIfDue(Order $order): void
    {
        if (! $order->customer_id) {
            return;
        }

        $referral = LoyaltyReferral::query()
            ->where('referred_customer_id', $order->customer_id)
            ->where('status', 'attributed')
            ->latest('attributed_at')
            ->first();

        if (! $referral) {
            return;
        }

        if ($referral->referrer_customer_id === $order->customer_id) {
            $referral->update(['status' => 'blocked']);

            return;
        }

        // Only credit once per referred customer ever.
        $priorCredit = LoyaltyReferral::query()
            ->where('referred_customer_id', $order->customer_id)
            ->where('status', 'credited')
            ->exists();
        if ($priorCredit) {
            $referral->update(['status' => 'blocked']);

            return;
        }

        DB::transaction(function () use ($referral, $order) {
            $settings = $this->settings();
            $referrerAccount = $this->loyaltyService->findOrCreateAccountRecord($referral->referrer_customer_id);

            if ($referrerAccount->membership_status !== 'active') {
                // Still award progress if they become active later — activate soft-eligible
                $referrer = Customer::withoutGlobalScopes()->find($referral->referrer_customer_id);
                if ($referrer && $this->completedOrderCount($referrer->id) >= 1 && ! $settings->enrollments_paused) {
                    try {
                        $this->enrollCustomer($referrer, 'auto', false);
                        $referrerAccount = $referrerAccount->fresh();
                    } catch (\Throwable) {
                        // leave credit pending via stay attributed? Prefer credit points anyway to prospect
                    }
                }
            }

            if ($settings->referral_points_credit > 0) {
                $this->loyaltyService->applyPointsInternal(
                    $referral->referrer_customer_id,
                    'earn',
                    (int) $settings->referral_points_credit,
                    $order->id,
                );
            }

            if ($settings->referral_stamp_credit > 0) {
                $account = $this->loyaltyService->findOrCreateAccountRecord($referral->referrer_customer_id);
                $account->update([
                    'stamps_balance' => $account->stamps_balance + (int) $settings->referral_stamp_credit,
                ]);
                $this->loyaltyService->syncPackageProgress($account->fresh());
            }

            $referral->update([
                'status' => 'credited',
                'credited_order_id' => $order->id,
                'credited_at' => now(),
            ]);
        });
    }

    private function assertPackagePayload(array $data): void
    {
        if (! in_array($data['package_type'] ?? '', ['stamp', 'points'], true)) {
            throw ValidationException::withMessages(['package_type' => ['Must be stamp or points.']]);
        }
        if (! in_array($data['reward_type'] ?? '', ['free_meal', 'percent_off', 'fixed_credit', 'custom'], true)) {
            throw ValidationException::withMessages(['reward_type' => ['Invalid reward type.']]);
        }
        if ((int) ($data['goal_value'] ?? 0) < 1) {
            throw ValidationException::withMessages(['goal_value' => ['Goal must be at least 1.']]);
        }
    }

    private function authorizeManage(array $permissions): void
    {
        $this->permissionService->authorize($permissions, 'loyalty.manage');
    }

    private function restaurantFallback(): string
    {
        return $this->tenantContext->tenant()?->name ?? 'our kitchen';
    }
}
