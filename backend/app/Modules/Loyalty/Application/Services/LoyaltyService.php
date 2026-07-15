<?php

namespace App\Modules\Loyalty\Application\Services;

use App\Modules\CRM\Domain\Models\Customer;
use App\Modules\Loyalty\Domain\Models\LoyaltyAccount;
use App\Modules\Loyalty\Domain\Models\LoyaltyPackage;
use App\Modules\Loyalty\Domain\Models\LoyaltyPackageProgress;
use App\Modules\Loyalty\Domain\Models\LoyaltyTransaction;
use App\Modules\Loyalty\Events\LoyaltyUpdated;
use App\Modules\Orders\Domain\Models\Order;
use App\Shared\Auth\PermissionService;
use App\Shared\Entitlements\FeatureAccessService;
use App\Shared\Events\DomainEventLogger;
use App\Shared\Tenancy\TenantContext;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class LoyaltyService
{
    public function __construct(
        private TenantContext $tenantContext,
        private PermissionService $permissionService,
        private FeatureAccessService $featureAccessService,
        private LoyaltyNotificationService $notificationService,
    ) {}

    public function getAccount(string $customerId, array $permissions): LoyaltyAccount
    {
        $this->permissionService->authorize($permissions, 'loyalty.manage');
        $this->featureAccessService->assertAccess('loyalty_system');

        return $this->findOrCreateAccountRecord($customerId);
    }

    public function getAccountPublic(string $customerId): LoyaltyAccount
    {
        $this->featureAccessService->assertAccess('loyalty_system');

        return $this->findOrCreateAccountRecord($customerId);
    }

    public function findOrCreateAccountRecord(string $customerId): LoyaltyAccount
    {
        return LoyaltyAccount::firstOrCreate(
            ['customer_id' => $customerId, 'tenant_id' => $this->tenantContext->id()],
            [
                'points_balance' => 0,
                'stamps_balance' => 0,
                'tier' => 'bronze',
                'membership_status' => 'prospect',
                'created_at' => now(),
            ],
        );
    }

    public function earn(array $data, array $permissions): LoyaltyAccount
    {
        $this->permissionService->authorize($permissions, 'loyalty.manage');
        $this->featureAccessService->assertAccess('loyalty_system');

        return $this->applyPointsInternal($data['customer_id'], 'earn', (int) $data['points'], $data['reference_id'] ?? null);
    }

    public function redeem(array $data, array $permissions): LoyaltyAccount
    {
        $this->permissionService->authorize($permissions, 'loyalty.manage');
        $this->featureAccessService->assertAccess('loyalty_system');

        return $this->applyPointsInternal($data['customer_id'], 'redeem', (int) $data['points'], $data['reference_id'] ?? null);
    }

    public function handleOrderCompleted(Order $order): void
    {
        if (! $order->customer_id) {
            return;
        }

        if (! $this->featureAccessService->canAccess('loyalty_system', $order->tenant_id)) {
            return;
        }

        $program = app(LoyaltyProgramService::class);
        $customer = Customer::withoutGlobalScopes()->find($order->customer_id);
        if (! $customer) {
            return;
        }

        $program->creditReferralIfDue($order);
        $account = $program->evaluateEnrollmentAfterOrder($customer);

        if (! $account || $account->membership_status !== 'active') {
            return;
        }

        $points = (int) floor((float) $order->total_amount);
        if ($points > 0) {
            $account = $this->applyPointsInternal($order->customer_id, 'earn', $points, $order->id);
        }

        $account = $this->findOrCreateAccountRecord($order->customer_id);
        $itemCount = max(1, (int) $order->items()->sum('quantity'));
        $account->update(['stamps_balance' => $account->stamps_balance + $itemCount]);
        $account = $account->fresh();

        $this->syncPackageProgress($account);
    }

    public function applyPointsInternal(string $customerId, string $type, int $points, ?string $referenceId): LoyaltyAccount
    {
        return DB::transaction(function () use ($customerId, $type, $points, $referenceId) {
            $account = $this->findOrCreateAccountRecord($customerId);

            if ($type === 'redeem' && $account->points_balance < $points) {
                throw ValidationException::withMessages(['points' => ['Insufficient loyalty points.']]);
            }

            // Recovery stacking rule: redeem blocked when order has recovery campaign — enforced at checkout later if needed.
            $delta = $type === 'earn' ? $points : -$points;
            $account->update(['points_balance' => $account->points_balance + $delta]);
            $account = $this->updateTier($account);

            LoyaltyTransaction::create([
                'tenant_id' => $account->tenant_id,
                'customer_id' => $customerId,
                'type' => $type,
                'points' => $points,
                'reference_id' => $referenceId,
                'created_at' => now(),
            ]);

            DomainEventLogger::log($account->tenant_id, 'LoyaltyUpdated', [
                'customer_id' => $customerId,
                'type' => $type,
                'points' => $points,
            ], $account->id, 'loyalty_account');

            LoyaltyUpdated::dispatch($account->fresh(), $type, $points);

            if ($type === 'earn') {
                $this->syncPackageProgress($account->fresh());
            }

            return $account->fresh();
        });
    }

    public function syncPackageProgress(LoyaltyAccount $account): void
    {
        $packages = LoyaltyPackage::query()
            ->where('tenant_id', $account->tenant_id)
            ->where('is_active', true)
            ->get();

        $settings = app(LoyaltyProgramService::class)->settings();
        $threshold = max(1, min(99, (int) $settings->near_goal_threshold_percent));
        $customer = Customer::withoutGlobalScopes()->find($account->customer_id);

        foreach ($packages as $package) {
            $progressValue = $package->package_type === 'stamp'
                ? (int) $account->stamps_balance
                : (int) $account->points_balance;

            $row = LoyaltyPackageProgress::firstOrCreate(
                [
                    'loyalty_account_id' => $account->id,
                    'loyalty_package_id' => $package->id,
                ],
                [
                    'tenant_id' => $account->tenant_id,
                    'current_progress' => 0,
                    'times_completed' => 0,
                ],
            );

            $previous = (int) $row->current_progress;
            $goal = max(1, (int) $package->goal_value);
            $withinCycle = $progressValue % $goal;
            // Show progress toward next reward; if exact multiple and >0, show goal as complete.
            $display = $progressValue > 0 && $withinCycle === 0 ? $goal : $withinCycle;
            $completedCycles = intdiv($progressValue, $goal);

            $row->update([
                'current_progress' => $display,
                'times_completed' => $completedCycles,
            ]);

            $near = ($display / $goal) * 100 >= $threshold && $display < $goal;
            $wasNear = ($previous / $goal) * 100 >= $threshold && $previous < $goal;

            if ($near && ! $wasNear && $customer && $account->membership_status === 'active') {
                $remaining = $goal - $display;
                $unit = $package->package_type === 'stamp' ? 'stamp(s)' : 'point(s)';
                $this->notificationService->notifyCustomer(
                    $account->tenant_id,
                    $customer,
                    'You are close to a loyalty reward',
                    'Only '.$remaining.' more '.$unit.' until you unlock: '.$package->reward_label,
                    ['event' => 'near_goal', 'package_id' => $package->id],
                );
                $row->update(['last_near_goal_notified_at' => now()]);
            }
        }
    }

    private function updateTier(LoyaltyAccount $account): LoyaltyAccount
    {
        $tier = match (true) {
            $account->points_balance >= 1000 => 'gold',
            $account->points_balance >= 500 => 'silver',
            default => 'bronze',
        };
        $account->update(['tier' => $tier]);

        return $account;
    }
}
