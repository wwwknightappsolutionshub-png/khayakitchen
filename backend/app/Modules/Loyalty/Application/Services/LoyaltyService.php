<?php

namespace App\Modules\Loyalty\Application\Services;

use App\Modules\Loyalty\Domain\Models\LoyaltyAccount;
use App\Modules\Loyalty\Domain\Models\LoyaltyTransaction;
use App\Modules\Loyalty\Events\LoyaltyUpdated;
use App\Modules\Orders\Domain\Models\Order;
use App\Shared\Auth\PermissionService;
use App\Shared\Events\DomainEventLogger;
use App\Shared\Tenancy\TenantContext;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class LoyaltyService
{
    public function __construct(
        private TenantContext $tenantContext,
        private PermissionService $permissionService,
    ) {}

    public function getAccount(string $customerId, array $permissions): LoyaltyAccount
    {
        $this->permissionService->authorize($permissions, 'loyalty.manage');

        return LoyaltyAccount::firstOrCreate(
            ['customer_id' => $customerId, 'tenant_id' => $this->tenantContext->id()],
            ['points_balance' => 0, 'tier' => 'bronze', 'created_at' => now()],
        );
    }

    public function earn(array $data, array $permissions): LoyaltyAccount
    {
        $this->permissionService->authorize($permissions, 'loyalty.manage');

        return $this->applyPoints($data['customer_id'], 'earn', (int) $data['points'], $data['reference_id'] ?? null);
    }

    public function redeem(array $data, array $permissions): LoyaltyAccount
    {
        $this->permissionService->authorize($permissions, 'loyalty.manage');

        return $this->applyPoints($data['customer_id'], 'redeem', (int) $data['points'], $data['reference_id'] ?? null);
    }

    public function handleOrderCompleted(Order $order): void
    {
        if (! $order->customer_id) {
            return;
        }

        $points = (int) floor((float) $order->total_amount);
        if ($points <= 0) {
            return;
        }

        $permissions = $this->permissionService->forRole('owner');
        $this->applyPoints($order->customer_id, 'earn', $points, $order->id);
    }

    private function applyPoints(string $customerId, string $type, int $points, ?string $referenceId): LoyaltyAccount
    {
        return DB::transaction(function () use ($customerId, $type, $points, $referenceId) {
            $account = LoyaltyAccount::firstOrCreate(
                ['customer_id' => $customerId, 'tenant_id' => $this->tenantContext->id()],
                ['points_balance' => 0, 'tier' => 'bronze', 'created_at' => now()],
            );

            if ($type === 'redeem' && $account->points_balance < $points) {
                throw ValidationException::withMessages(['points' => ['Insufficient loyalty points.']]);
            }

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

            return $account->fresh();
        });
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
