<?php

namespace App\Modules\Loyalty\Application\Services;

use App\Modules\CRM\Domain\Models\Customer;
use App\Modules\Loyalty\Domain\Models\LoyaltyAccount;
use App\Modules\Loyalty\Domain\Models\LoyaltyPackage;
use App\Modules\Loyalty\Domain\Models\LoyaltyPackageProgress;
use App\Modules\Loyalty\Domain\Models\LoyaltyRedemptionVoucher;
use App\Modules\Loyalty\Domain\Models\LoyaltyTransaction;
use App\Modules\Loyalty\Events\LoyaltyUpdated;
use App\Modules\Orders\Domain\Models\Order;
use App\Modules\Pricing\Application\Services\AuditLogService;
use App\Modules\Realtime\Infrastructure\WebSocketGateway;
use App\Shared\Auth\PermissionService;
use App\Shared\Entitlements\FeatureAccessService;
use App\Shared\Events\DomainEventLogger;
use App\Shared\Tenancy\TenantContext;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class LoyaltyService
{
    public const VOUCHER_TTL_HOURS = 24;

    public function __construct(
        private TenantContext $tenantContext,
        private PermissionService $permissionService,
        private FeatureAccessService $featureAccessService,
        private LoyaltyNotificationService $notificationService,
        private AuditLogService $auditLogService,
        private WebSocketGateway $webSocketGateway,
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

    /**
     * Customer self-serve redeem — holds points on a pending kitchen voucher.
     *
     * @return array{voucher: array<string, mixed>, loyalty: LoyaltyAccount}
     */
    public function redeemForCustomer(string $customerId, string $phone, int $points, ?string $referenceId = null): array
    {
        return $this->requestRedemptionVoucher($customerId, $phone, $points, null);
    }

    /**
     * @return array{voucher: array<string, mixed>, loyalty: LoyaltyAccount}
     */
    public function requestRedemptionVoucher(
        string $customerId,
        string $phone,
        ?int $points,
        ?string $packageId,
    ): array {
        $this->featureAccessService->assertAccess('loyalty_system');

        $customer = Customer::where('id', $customerId)->where('phone', $phone)->firstOrFail();

        return DB::transaction(function () use ($customer, $points, $packageId) {
            $this->expireOverdueVouchers();

            $account = LoyaltyAccount::query()
                ->where('customer_id', $customer->id)
                ->lockForUpdate()
                ->first();
            if (! $account) {
                $account = $this->findOrCreateAccountRecord($customer->id);
                $account = LoyaltyAccount::query()->where('id', $account->id)->lockForUpdate()->firstOrFail();
            }

            if ($account->membership_status !== 'active') {
                throw ValidationException::withMessages([
                    'loyalty' => ['Join the loyalty program before redeeming a reward.'],
                ]);
            }

            $pending = LoyaltyRedemptionVoucher::query()
                ->where('customer_id', $customer->id)
                ->where('status', 'pending')
                ->lockForUpdate()
                ->first();
            if ($pending) {
                throw ValidationException::withMessages([
                    'voucher' => ['You already have a pending reward code. Show it at the counter or cancel it first.'],
                ]);
            }

            $package = null;
            $kind = 'points';
            $deductPoints = 0;
            $deductStamps = 0;
            $rewardType = 'custom';
            $rewardValue = null;
            $rewardLabel = '';

            if ($packageId) {
                $package = LoyaltyPackage::query()
                    ->where('id', $packageId)
                    ->where('is_active', true)
                    ->first();
                if (! $package) {
                    throw ValidationException::withMessages(['package_id' => ['That loyalty reward is not available.']]);
                }

                $kind = 'package';
                $goal = max(1, (int) $package->goal_value);
                $progressValue = $package->package_type === 'stamp'
                    ? (int) $account->stamps_balance
                    : (int) $account->points_balance;
                if ($progressValue < $goal) {
                    throw ValidationException::withMessages([
                        'package_id' => ['You have not reached this reward yet.'],
                    ]);
                }

                if ($package->package_type === 'stamp') {
                    $deductStamps = $goal;
                } else {
                    $deductPoints = $goal;
                }
                $rewardType = (string) $package->reward_type;
                $rewardValue = $package->reward_value;
                $rewardLabel = (string) $package->reward_label;
            } else {
                $deductPoints = (int) $points;
                if ($deductPoints < 1) {
                    throw ValidationException::withMessages(['points' => ['Redeem at least 1 point.']]);
                }
                $rewardLabel = $deductPoints.' point'.($deductPoints === 1 ? '' : 's').' reward';
            }

            if ($deductPoints > 0 && (int) $account->points_balance < $deductPoints) {
                throw ValidationException::withMessages(['points' => ['Insufficient loyalty points.']]);
            }
            if ($deductStamps > 0 && (int) $account->stamps_balance < $deductStamps) {
                throw ValidationException::withMessages(['stamps' => ['Insufficient loyalty stamps.']]);
            }

            $voucher = LoyaltyRedemptionVoucher::create([
                'tenant_id' => $account->tenant_id,
                'customer_id' => $customer->id,
                'loyalty_account_id' => $account->id,
                'loyalty_package_id' => $package?->id,
                'code' => $this->generateUniqueVoucherCode(),
                'kind' => $kind,
                'points' => $deductPoints,
                'stamps' => $deductStamps,
                'reward_type' => $rewardType,
                'reward_value' => $rewardValue,
                'reward_label' => $rewardLabel,
                'status' => 'pending',
                'expires_at' => now()->addHours(self::VOUCHER_TTL_HOURS),
            ]);

            if ($deductPoints > 0) {
                $this->applyPointsInternal($customer->id, 'redeem', $deductPoints, $voucher->id);
            }
            if ($deductStamps > 0) {
                $this->applyStampsInternal($customer->id, -$deductStamps);
            }

            $account = $this->findOrCreateAccountRecord($customer->id);

            $this->auditLogService->log(
                'loyalty.voucher_requested',
                $this->tenantContext->id(),
                null,
                'loyalty_redemption_voucher',
                $voucher->id,
                [
                    'customer_id' => $customer->id,
                    'points' => $deductPoints,
                    'stamps' => $deductStamps,
                    'code' => $voucher->code,
                    'kind' => $kind,
                ],
            );

            DomainEventLogger::log($account->tenant_id, 'LoyaltyVoucherRequested', [
                'customer_id' => $customer->id,
                'voucher_id' => $voucher->id,
                'code' => $voucher->code,
            ], $voucher->id, 'loyalty_redemption_voucher');

            $payload = $voucher->toApiArray($customer);
            $this->webSocketGateway->emit($account->tenant_id, 'kitchen', 'LoyaltyVoucherCreated', $payload);
            $this->webSocketGateway->emit($account->tenant_id, 'admin', 'LoyaltyVoucherCreated', $payload);

            return [
                'voucher' => $payload,
                'loyalty' => $account->fresh(),
            ];
        });
    }

    /**
     * @return list<array<string, mixed>>
     */
    public function listPendingVouchers(array $permissions): array
    {
        $this->authorizeFulfill($permissions);
        if (! $this->featureAccessService->canAccess('loyalty_system', $this->tenantContext->id())) {
            return [];
        }

        $this->expireOverdueVouchers();

        return LoyaltyRedemptionVoucher::query()
            ->where('status', 'pending')
            ->orderBy('created_at')
            ->get()
            ->map(function (LoyaltyRedemptionVoucher $voucher) {
                $customer = Customer::withoutGlobalScopes()->find($voucher->customer_id);

                return $voucher->toApiArray($customer);
            })
            ->values()
            ->all();
    }

    /**
     * @return array{voucher: array<string, mixed>, loyalty: LoyaltyAccount}
     */
    public function fulfilVoucher(string $voucherId, array $permissions, ?string $staffUserId): array
    {
        $this->authorizeFulfill($permissions);
        $this->featureAccessService->assertAccess('loyalty_system');

        return DB::transaction(function () use ($voucherId, $staffUserId) {
            $this->expireOverdueVouchers();

            $voucher = LoyaltyRedemptionVoucher::query()
                ->where('id', $voucherId)
                ->lockForUpdate()
                ->firstOrFail();

            if ($voucher->status !== 'pending') {
                throw ValidationException::withMessages([
                    'voucher' => ['This reward code is no longer pending.'],
                ]);
            }

            $voucher->update([
                'status' => 'fulfilled',
                'fulfilled_at' => now(),
                'fulfilled_by' => $staffUserId,
            ]);

            $customer = Customer::withoutGlobalScopes()->find($voucher->customer_id);
            $account = $this->findOrCreateAccountRecord($voucher->customer_id);

            $this->auditLogService->log(
                'loyalty.voucher_fulfilled',
                $this->tenantContext->id(),
                $staffUserId,
                'loyalty_redemption_voucher',
                $voucher->id,
                ['code' => $voucher->code, 'customer_id' => $voucher->customer_id],
            );

            DomainEventLogger::log($voucher->tenant_id, 'LoyaltyVoucherFulfilled', [
                'voucher_id' => $voucher->id,
                'code' => $voucher->code,
            ], $voucher->id, 'loyalty_redemption_voucher');

            $payload = $voucher->fresh()->toApiArray($customer);
            $this->webSocketGateway->emit($voucher->tenant_id, 'kitchen', 'LoyaltyVoucherFulfilled', $payload);
            $this->webSocketGateway->emit($voucher->tenant_id, 'admin', 'LoyaltyVoucherFulfilled', $payload);
            $this->webSocketGateway->emit($voucher->tenant_id, 'customer', 'LoyaltyVoucherFulfilled', $payload);

            if ($customer) {
                $this->notificationService->notifyCustomer(
                    $voucher->tenant_id,
                    $customer,
                    'Your loyalty reward was confirmed',
                    'The kitchen confirmed your code '.$voucher->code.'. Enjoy: '.$voucher->reward_label,
                    ['event' => 'voucher_fulfilled', 'voucher_id' => $voucher->id],
                );
            }

            return [
                'voucher' => $payload,
                'loyalty' => $account,
            ];
        });
    }

    /**
     * @return array{voucher: array<string, mixed>, loyalty: LoyaltyAccount}
     */
    public function cancelVoucher(string $voucherId, array $permissions, ?string $staffUserId): array
    {
        $this->authorizeFulfill($permissions);
        $this->featureAccessService->assertAccess('loyalty_system');

        return $this->releasePendingVoucher($voucherId, 'cancelled', $staffUserId);
    }

    /**
     * @return array{voucher: array<string, mixed>, loyalty: LoyaltyAccount}
     */
    public function cancelVoucherForCustomer(string $customerId, string $phone, string $voucherId): array
    {
        $this->featureAccessService->assertAccess('loyalty_system');
        $customer = Customer::where('id', $customerId)->where('phone', $phone)->firstOrFail();

        return $this->releasePendingVoucher($voucherId, 'cancelled', null, $customer->id);
    }

    /**
     * @return list<array<string, mixed>>
     */
    public function vouchersForCustomer(string $customerId): array
    {
        $this->expireOverdueVouchers();

        return LoyaltyRedemptionVoucher::query()
            ->where('customer_id', $customerId)
            ->orderByDesc('created_at')
            ->limit(8)
            ->get()
            ->map(fn (LoyaltyRedemptionVoucher $voucher) => $voucher->toApiArray())
            ->all();
    }

    public function pendingVoucherForCustomer(string $customerId): ?array
    {
        $this->expireOverdueVouchers();

        $voucher = LoyaltyRedemptionVoucher::query()
            ->where('customer_id', $customerId)
            ->where('status', 'pending')
            ->orderByDesc('created_at')
            ->first();

        return $voucher?->toApiArray();
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

    private function authorizeFulfill(array $permissions): void
    {
        if (
            $this->permissionService->has($permissions, 'loyalty.manage')
            || $this->permissionService->has($permissions, 'kitchen.view')
        ) {
            return;
        }

        abort(403, 'Insufficient permissions');
    }

    private function applyStampsInternal(string $customerId, int $delta): LoyaltyAccount
    {
        $account = $this->findOrCreateAccountRecord($customerId);
        $next = (int) $account->stamps_balance + $delta;
        if ($next < 0) {
            throw ValidationException::withMessages(['stamps' => ['Insufficient loyalty stamps.']]);
        }
        $account->update(['stamps_balance' => $next]);
        $account = $account->fresh();
        $this->syncPackageProgress($account);

        return $account;
    }

    private function expireOverdueVouchers(): void
    {
        $overdue = LoyaltyRedemptionVoucher::query()
            ->where('status', 'pending')
            ->where('expires_at', '<', now())
            ->get();

        foreach ($overdue as $voucher) {
            $this->releasePendingVoucher($voucher->id, 'expired', null, null);
        }
    }

    /**
     * @return array{voucher: array<string, mixed>, loyalty: LoyaltyAccount}
     */
    private function releasePendingVoucher(
        string $voucherId,
        string $status,
        ?string $staffUserId,
        ?string $mustBelongToCustomerId = null,
    ): array {
        return DB::transaction(function () use ($voucherId, $status, $staffUserId, $mustBelongToCustomerId) {
            $voucher = LoyaltyRedemptionVoucher::query()
                ->where('id', $voucherId)
                ->lockForUpdate()
                ->firstOrFail();

            if ($mustBelongToCustomerId && $voucher->customer_id !== $mustBelongToCustomerId) {
                abort(403, 'This reward code does not belong to you.');
            }

            if ($voucher->status !== 'pending') {
                throw ValidationException::withMessages([
                    'voucher' => ['This reward code is no longer pending.'],
                ]);
            }

            if ((int) $voucher->points > 0) {
                $this->applyPointsInternal($voucher->customer_id, 'earn', (int) $voucher->points, $voucher->id);
            }
            if ((int) $voucher->stamps > 0) {
                $this->applyStampsInternal($voucher->customer_id, (int) $voucher->stamps);
            }

            $voucher->update([
                'status' => $status,
                'cancelled_at' => now(),
            ]);

            $customer = Customer::withoutGlobalScopes()->find($voucher->customer_id);
            $account = $this->findOrCreateAccountRecord($voucher->customer_id);

            $this->auditLogService->log(
                $status === 'expired' ? 'loyalty.voucher_expired' : 'loyalty.voucher_cancelled',
                $this->tenantContext->id(),
                $staffUserId,
                'loyalty_redemption_voucher',
                $voucher->id,
                ['code' => $voucher->code, 'customer_id' => $voucher->customer_id],
            );

            DomainEventLogger::log($voucher->tenant_id, 'LoyaltyVoucherReleased', [
                'voucher_id' => $voucher->id,
                'status' => $status,
            ], $voucher->id, 'loyalty_redemption_voucher');

            $payload = $voucher->fresh()->toApiArray($customer);
            $this->webSocketGateway->emit($voucher->tenant_id, 'kitchen', 'LoyaltyVoucherReleased', $payload);
            $this->webSocketGateway->emit($voucher->tenant_id, 'admin', 'LoyaltyVoucherReleased', $payload);

            return [
                'voucher' => $payload,
                'loyalty' => $account,
            ];
        });
    }

    private function generateUniqueVoucherCode(): string
    {
        $alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        for ($attempt = 0; $attempt < 16; $attempt++) {
            $code = '';
            for ($i = 0; $i < 6; $i++) {
                $code .= $alphabet[random_int(0, strlen($alphabet) - 1)];
            }
            $exists = LoyaltyRedemptionVoucher::query()->where('code', $code)->exists();
            if (! $exists) {
                return $code;
            }
        }

        return strtoupper(Str::random(6));
    }
}
