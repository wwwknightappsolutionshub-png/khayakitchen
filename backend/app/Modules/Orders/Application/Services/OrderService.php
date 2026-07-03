<?php

namespace App\Modules\Orders\Application\Services;

use App\Modules\Menu\Domain\Models\Meal;
use App\Modules\Menu\Domain\Models\MealOption;
use App\Modules\Orders\Domain\Models\Order;
use App\Modules\Orders\Domain\Models\OrderItem;
use App\Modules\Orders\Domain\Models\OrderItemOption;
use App\Modules\Orders\Events\OrderCancelled;
use App\Modules\Orders\Events\OrderCompleted;
use App\Modules\Orders\Events\OrderCreated;
use App\Modules\Orders\Events\OrderStatusUpdated;
use App\Modules\Orders\Infrastructure\Repositories\OrderRepository;
use App\Modules\Pricing\Application\Services\PlanLimitService;
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

    public function __construct(
        private OrderRepository $orderRepository,
        private TenantContext $tenantContext,
        private PermissionService $permissionService,
        private PlanLimitService $planLimitService,
        private FeatureAccessService $featureAccessService,
        private RestaurantStatusService $restaurantStatusService,
    ) {}

    public function createOrder(array $data, array $permissions): array
    {
        $this->permissionService->authorize($permissions, 'orders.create');
        $this->featureAccessService->assertAccess('orders');
        $this->restaurantStatusService->assertAcceptingOrders();
        $this->planLimitService->assertOrderLimit();

        return DB::transaction(function () use ($data) {
            $total = 0;
            $userId = $this->tenantContext->user()?->id;

            $order = $this->orderRepository->create([
                'customer_id' => $data['customer_id'] ?? null,
                'status' => 'pending',
                'order_type' => $data['order_type'] ?? 'pickup',
                'scheduled_time' => $data['scheduled_time'] ?? null,
                'total_amount' => 0,
                'created_by' => $userId,
                'updated_by' => $userId,
            ]);

            foreach ($data['items'] as $itemData) {
                $meal = Meal::findOrFail($itemData['meal_id']);
                $quantity = $itemData['quantity'] ?? 1;
                $itemPrice = (float) $meal->base_price;
                $optionDelta = 0;

                $orderItem = OrderItem::create([
                    'tenant_id' => $order->tenant_id,
                    'order_id' => $order->id,
                    'meal_id' => $meal->id,
                    'quantity' => $quantity,
                    'base_price' => $meal->base_price,
                    'final_price' => 0,
                ]);

                foreach ($itemData['options'] ?? [] as $optData) {
                    $option = MealOption::findOrFail($optData['option_id']);
                    $optionDelta += (float) $option->price_delta;
                    OrderItemOption::create([
                        'tenant_id' => $order->tenant_id,
                        'order_item_id' => $orderItem->id,
                        'option_id' => $option->id,
                        'price_delta' => $option->price_delta,
                    ]);
                }

                $lineTotal = ($itemPrice + $optionDelta) * $quantity;
                $orderItem->update(['final_price' => $lineTotal]);
                $total += $lineTotal;
            }

            $order->update(['total_amount' => $total]);
            $order->load(['items.options']);

            DomainEventLogger::log($order->tenant_id, 'OrderCreated', ['order_id' => $order->id], $order->id, 'order');
            OrderCreated::dispatch($order->fresh(['items.options']));

            return [
                'order_id' => $order->id,
                'status' => $order->status,
                'total' => (float) $order->total_amount,
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

        if ($order->status === 'completed') {
            throw ValidationException::withMessages(['status' => ['Completed orders cannot be edited.']]);
        }

        if ($order->status === 'cancelled') {
            throw ValidationException::withMessages(['status' => ['Cancelled orders cannot be updated.']]);
        }

        $previous = $order->status;
        $order->update([
            'status' => $status,
            'updated_by' => $this->tenantContext->user()?->id,
        ]);

        DomainEventLogger::log($order->tenant_id, 'OrderStatusUpdated', [
            'order_id' => $order->id,
            'from' => $previous,
            'to' => $status,
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
            ->whereIn('status', ['accepted', 'preparing', 'ready'])
            ->values();
    }
}
