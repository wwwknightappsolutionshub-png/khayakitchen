<?php

namespace App\Modules\Orders\Application\Services;

use App\Modules\CRM\Application\Services\CrmService;
use App\Modules\Delivery\Application\Services\DeliveryService;
use App\Modules\Menu\Domain\Models\Meal;
use App\Modules\Menu\Domain\Models\MealOption;
use App\Modules\Orders\Application\Services\PaymentAccountsService;
use App\Modules\Orders\Domain\Models\Order;
use App\Modules\Orders\Domain\Models\OrderItem;
use App\Modules\Orders\Domain\Models\OrderItemOption;
use App\Modules\Orders\Domain\Models\Payment;
use App\Modules\Orders\Events\OrderCancelled;
use App\Modules\Orders\Events\OrderCompleted;
use App\Modules\Orders\Events\OrderCreated;
use App\Modules\Orders\Events\OrderStatusUpdated;
use App\Modules\Orders\Infrastructure\Repositories\OrderRepository;
use App\Modules\Pricing\Application\Services\PlanLimitService;
use App\Modules\RevenueRecovery\Application\Services\RevenueRecoveryCampaignService;
use App\Modules\RevenueRecovery\Application\Services\RevenueRecoveryPricingService;
use App\Modules\RevenueRecovery\Domain\Models\RevenueRecoveryCampaign;
use App\Modules\StaffPerformance\Domain\Models\OrderStatusEvent;
use App\Modules\TenantBranding\Application\Services\RestaurantStatusService;
use App\Shared\Auth\PermissionService;
use App\Shared\Entitlements\FeatureAccessService;
use App\Shared\Events\DomainEventLogger;
use App\Shared\Tenancy\TenantContext;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class OrderService
{
    private const STATUS_FLOW = ['pending', 'accepted', 'preparing', 'ready', 'completed'];

    private const OPEN_STATUSES = ['pending', 'accepted', 'preparing', 'ready'];

    private const TERMINAL_STATUSES = ['completed', 'cancelled', 'undone'];

    public function __construct(
        private OrderRepository $orderRepository,
        private TenantContext $tenantContext,
        private PermissionService $permissionService,
        private PlanLimitService $planLimitService,
        private FeatureAccessService $featureAccessService,
        private RestaurantStatusService $restaurantStatusService,
        private RevenueRecoveryPricingService $revenueRecoveryPricingService,
        private RevenueRecoveryCampaignService $revenueRecoveryCampaignService,
        private CrmService $crmService,
        private DeliveryService $deliveryService,
        private PaymentAccountsService $paymentAccountsService,
    ) {}

    public function createOrder(array $data, array $permissions): array
    {
        $this->permissionService->authorize($permissions, 'orders.create');
        $this->featureAccessService->assertAccess('orders');
        $this->restaurantStatusService->assertAcceptingOrders();
        $this->planLimitService->assertOrderLimit();

        return $this->persistNewOrder($data, $data['customer_id'] ?? null, $this->tenantContext->user()?->id);
    }

    public function createCustomerOrder(array $data): array
    {
        $this->featureAccessService->assertAccess('orders');
        $this->restaurantStatusService->assertAcceptingOrders();
        $this->planLimitService->assertOrderLimit();

        [$customer, $wasCreated] = $this->crmService->findOrCreateByPhone($data['phone'], $data['name']);

        $priorOrderCount = Order::withoutGlobalScopes()
            ->where('tenant_id', $this->tenantContext->id())
            ->where('customer_id', $customer->id)
            ->whereNull('deleted_at')
            ->count();

        // "New customer" = CRM row just created OR first successful order for this phone in tenant.
        $isNewCustomer = $wasCreated || $priorOrderCount === 0;

        $emailJustSet = false;
        if (! empty($data['email']) && ! $customer->email) {
            $customer->update(['email' => $data['email']]);
            $customer = $customer->fresh();
            $emailJustSet = true;
        }

        if (! empty($data['referral_token'])) {
            app(\App\Modules\Loyalty\Application\Services\LoyaltyProgramService::class)
                ->attributeReferral($data['referral_token'], $customer);
        }

        $result = $this->persistNewOrder(
            $data,
            $customer->id,
            null,
            $data['payment_method'] ?? 'card',
        );

        $loyaltyProgram = app(\App\Modules\Loyalty\Application\Services\LoyaltyProgramService::class);
        $claimMeta = $loyaltyProgram->installClaimEligibilityForCustomer($customer);

        if ($emailJustSet) {
            $loyaltyProgram->sendInstallWelcomeIfDue($customer->fresh());
        }

        return array_merge($result, [
            'is_new_customer' => $isNewCustomer,
            'install_claim_eligible' => $isNewCustomer && $claimMeta['eligible'],
            'install_claim_points' => $claimMeta['points'],
            'app_installed' => $claimMeta['app_installed'],
        ]);
    }

    /**
     * @return array{order_id: string, status: string, total: float, customer_id: string}
     */
    private function persistNewOrder(
        array $data,
        ?string $customerId,
        ?string $userId,
        ?string $paymentMethod = null,
    ): array {
        return DB::transaction(function () use ($data, $customerId, $userId, $paymentMethod) {
            $total = 0;
            $discountTotal = 0;
            $primaryCampaign = null;
            $discountedItemCount = 0;

            $order = $this->orderRepository->create([
                'customer_id' => $customerId,
                'status' => 'pending',
                'order_type' => $data['order_type'] ?? 'pickup',
                'scheduled_time' => $data['scheduled_time'] ?? null,
                'total_amount' => 0,
                'discount_total' => 0,
                'created_by' => $userId,
                'updated_by' => $userId,
            ]);

            foreach ($data['items'] as $itemData) {
                $meal = Meal::findOrFail($itemData['meal_id']);
                $quantity = $itemData['quantity'] ?? 1;
                $optionDelta = 0;

                foreach ($itemData['options'] ?? [] as $optData) {
                    $option = MealOption::findOrFail($optData['option_id']);
                    $optionDelta += (float) $option->price_delta;
                }

                $pricing = $this->revenueRecoveryPricingService->resolveLinePricing($meal, $optionDelta, $quantity);
                $lineTotal = round($pricing['unit_price'] * $quantity, 2);
                $lineDiscount = round($pricing['discount_amount'] * $quantity, 2);

                if ($pricing['campaign']) {
                    $primaryCampaign = $pricing['campaign'];
                    $discountedItemCount += $quantity;
                }

                $orderItem = OrderItem::create([
                    'tenant_id' => $order->tenant_id,
                    'order_id' => $order->id,
                    'meal_id' => $meal->id,
                    'quantity' => $quantity,
                    'base_price' => $meal->base_price,
                    'final_price' => $lineTotal,
                    'discount_amount' => $lineDiscount,
                    'revenue_recovery_campaign_id' => $pricing['campaign']?->id,
                ]);

                foreach ($itemData['options'] ?? [] as $optData) {
                    $option = MealOption::findOrFail($optData['option_id']);
                    OrderItemOption::create([
                        'tenant_id' => $order->tenant_id,
                        'order_item_id' => $orderItem->id,
                        'option_id' => $option->id,
                        'price_delta' => $option->price_delta,
                    ]);
                }

                $total += $lineTotal;
                $discountTotal += $lineDiscount;
            }

            $order->update([
                'total_amount' => $total,
                'discount_total' => $discountTotal,
                'revenue_recovery_campaign_id' => $primaryCampaign?->id,
            ]);

            if ($primaryCampaign instanceof RevenueRecoveryCampaign) {
                $this->revenueRecoveryCampaignService->recordOrderMetrics(
                    $primaryCampaign,
                    $discountTotal,
                    $discountedItemCount,
                );
            }

            if ($paymentMethod) {
                $isTransfer = $paymentMethod === 'transfer';
                Payment::create([
                    'tenant_id' => $order->tenant_id,
                    'order_id' => $order->id,
                    'provider' => $paymentMethod,
                    'status' => $isTransfer ? 'pending' : 'paid',
                    'amount' => $total,
                    'proof_wait_started_at' => $isTransfer ? now() : null,
                    'created_at' => now(),
                ]);
            }

            if (($data['order_type'] ?? '') === 'delivery' && ! empty($data['address'])) {
                $this->deliveryService->createForOrder($order, $data['address']);
            }

            $order->load(['items.options']);

            DomainEventLogger::log($order->tenant_id, 'OrderCreated', ['order_id' => $order->id], $order->id, 'order');

            $orderId = $order->id;
            $customerIdForResponse = $customerId;
            $statusForResponse = $order->status;
            $totalForResponse = (float) $order->total_amount;
            $discountForResponse = (float) $order->discount_total;
            $tenantIdForEvent = $order->tenant_id;

            DB::afterCommit(function () use ($orderId, $tenantIdForEvent) {
                try {
                    $fresh = Order::withoutGlobalScopes()
                        ->where('tenant_id', $tenantIdForEvent)
                        ->where('id', $orderId)
                        ->with(['items.options'])
                        ->first();

                    if ($fresh) {
                        OrderCreated::dispatch($fresh);
                    }
                } catch (\Throwable $e) {
                    report($e);
                }
            });

            return [
                'order_id' => $orderId,
                'customer_id' => $customerIdForResponse,
                'status' => $statusForResponse,
                'total' => $totalForResponse,
                'discount_total' => $discountForResponse,
            ];
        });
    }

    public function listOrders(?string $status, array $permissions)
    {
        $this->permissionService->authorize($permissions, 'orders.view');

        return $this->orderRepository->list($status);
    }

    public function updateStatus(string $id, string $status, array $permissions): Order
    {
        if (
            ! $this->permissionService->has($permissions, 'orders.update')
            && ! $this->permissionService->has($permissions, 'orders.update_status')
        ) {
            abort(403, 'Insufficient permissions');
        }

        $order = $this->orderRepository->findOrFail($id);

        if (in_array($order->status, self::TERMINAL_STATUSES, true)) {
            throw ValidationException::withMessages([
                'status' => [ucfirst($order->status).' orders cannot be updated.'],
            ]);
        }

        $previous = $order->status;
        $user = $this->tenantContext->user() ?? auth('sanctum')->user();
        $this->assertStatusTransitionAllowed($previous, $status, $user?->role);

        if ($status === 'accepted' && $previous === 'pending') {
            $this->paymentAccountsService->assertTransferAcceptable($order);
        }

        $actorId = $user?->id;
        $updates = [
            'status' => $status,
            'updated_by' => $actorId,
        ];

        if ($status === 'accepted' && $previous !== 'accepted') {
            $updates['accepted_by'] = $actorId;
            $updates['accepted_at'] = now();
        }

        if ($status === 'completed' && $previous !== 'completed') {
            $updates['completed_by'] = $actorId;
            $updates['completed_at'] = now();
            if (! $order->accepted_at) {
                $updates['accepted_at'] = $order->accepted_at ?? $order->created_at ?? now();
                $updates['accepted_by'] = $order->accepted_by ?? $actorId;
            }
        }

        $order->update($updates);

        OrderStatusEvent::create([
            'tenant_id' => $order->tenant_id,
            'order_id' => $order->id,
            'user_id' => $actorId,
            'from_status' => $previous,
            'to_status' => $status,
            'created_at' => now(),
        ]);

        DomainEventLogger::log($order->tenant_id, 'OrderStatusUpdated', [
            'order_id' => $order->id,
            'from' => $previous,
            'to' => $status,
            'user_id' => $actorId,
        ], $order->id, 'order');

        OrderStatusUpdated::dispatch($order->fresh(['items.options']), $previous);

        if ($status === 'cancelled' && $previous !== 'cancelled') {
            OrderCancelled::dispatch($order->fresh(['items.options']));
            DomainEventLogger::log($order->tenant_id, 'OrderCancelled', ['order_id' => $order->id], $order->id, 'order');
        }

        if ($status === 'completed' && $previous !== 'completed') {
            OrderCompleted::dispatch($order->fresh(['items.options']));
            DomainEventLogger::log($order->tenant_id, 'OrderCompleted', ['order_id' => $order->id], $order->id, 'order');
        }

        return $order->fresh(['items.options']);
    }

    private function assertStatusTransitionAllowed(string $from, string $to, ?string $role): void
    {
        if ($to === 'cancelled') {
            if (! in_array($from, self::OPEN_STATUSES, true)) {
                throw ValidationException::withMessages([
                    'status' => ['Only open orders can be cancelled.'],
                ]);
            }

            return;
        }

        if ($to === 'undone') {
            throw ValidationException::withMessages([
                'status' => ['Undone status is set automatically at end of day.'],
            ]);
        }

        $fromIndex = array_search($from, self::STATUS_FLOW, true);
        $toIndex = array_search($to, self::STATUS_FLOW, true);

        if ($fromIndex === false || $toIndex === false || $toIndex !== $fromIndex + 1) {
            throw ValidationException::withMessages([
                'status' => ["Invalid status transition from {$from} to {$to}."],
            ]);
        }

        // Owners and managers can drive the full flow.
        if (in_array($role, ['owner', 'manager', 'super_admin'], true)) {
            return;
        }

        $allowedTargets = match ($role) {
            'staff' => ['accepted', 'completed', 'cancelled'],
            'kitchen' => ['preparing', 'ready', 'cancelled'],
            default => [],
        };

        if (! in_array($to, $allowedTargets, true)) {
            abort(403, 'Your role cannot set this order status');
        }
    }

    public function cancelOrder(string $id, array $permissions): Order
    {
        if (
            ! $this->permissionService->has($permissions, 'orders.update')
            && ! $this->permissionService->has($permissions, 'orders.update_status')
        ) {
            abort(403, 'Insufficient permissions');
        }

        return $this->updateStatus($id, 'cancelled', $permissions);
    }

    public function getKitchenOrders(array $permissions)
    {
        $this->permissionService->authorize($permissions, 'kitchen.view');

        return $this->orderRepository->list(null)
            ->filter(function (Order $o) {
                // Floor staff accepts first; kitchen works accepted → preparing → ready.
                if (in_array($o->status, ['accepted', 'preparing', 'ready'], true)) {
                    return true;
                }

                if (in_array($o->status, ['cancelled', 'undone'], true)) {
                    return $o->updated_at >= now()->subHours(24);
                }

                if ($o->status === 'completed') {
                    return $o->updated_at >= now()->subHours(2);
                }

                return false;
            })
            ->sortBy(fn (Order $o) => [
                match ($o->status) {
                    'accepted' => 0,
                    'preparing' => 1,
                    'ready' => 2,
                    'undone' => 3,
                    'cancelled' => 4,
                    'completed' => 5,
                    default => 6,
                },
                $o->scheduled_time ?? $o->created_at,
            ])
            ->values();
    }

    /**
     * End-of-day: unfinished orders from prior calendar days become undone.
     *
     * @return int Number of orders affected
     */
    public function markPriorDayOrdersUndone(bool $dryRun = false): int
    {
        $cutoff = now()->startOfDay();

        $query = Order::withoutGlobalScopes()
            ->whereIn('status', self::OPEN_STATUSES)
            ->where('created_at', '<', $cutoff);

        $count = $query->count();

        if ($dryRun || $count === 0) {
            return $count;
        }

        Order::withoutGlobalScopes()
            ->whereIn('status', self::OPEN_STATUSES)
            ->where('created_at', '<', $cutoff)
            ->update([
                'status' => 'undone',
                'updated_at' => now(),
            ]);

        return $count;
    }

    public function showCustomerOrder(string $id, string $phone): Order
    {
        $customer = \App\Modules\CRM\Domain\Models\Customer::where('phone', $phone)->firstOrFail();

        $order = Order::where('customer_id', $customer->id)
            ->where('id', $id)
            ->with(['items.meal', 'items.options.option', 'payments'])
            ->firstOrFail();

        return $this->paymentAccountsService->enrichOrderPaymentAttributes($order);
    }

    public function showOrder(string $id, array $permissions): Order
    {
        $this->permissionService->authorize($permissions, 'orders.view');

        return $this->orderRepository->findOrFail($id)->load(['items.options']);
    }

    public function listCustomerOrders(string $phone): array
    {
        $customer = \App\Modules\CRM\Domain\Models\Customer::where('phone', $phone)->first();

        if (! $customer) {
            return ['orders' => []];
        }

        $orders = Order::where('customer_id', $customer->id)
            ->orderByDesc('created_at')
            ->limit(20)
            ->get(['id', 'status', 'order_type', 'total_amount', 'discount_total', 'scheduled_time', 'created_at']);

        return ['orders' => $orders, 'customer_id' => $customer->id];
    }
}
