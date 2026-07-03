<?php

namespace App\Modules\Realtime\Infrastructure;

use App\Modules\Menu\Domain\Models\Meal;
use App\Modules\Realtime\Broadcasts\RealtimeMessage;
use App\Modules\Realtime\Application\Services\RealtimeEventBuffer;
use App\Modules\Orders\Domain\Models\Order;
use Illuminate\Support\Facades\Cache;

class WebSocketGateway
{
    public function __construct(private RealtimeEventBuffer $buffer) {}

    public function channelName(string $tenantId, string $channel): string
    {
        return "tenant.{$tenantId}.{$channel}";
    }

    public function emit(string $tenantId, string $channel, string $event, array $payload): void
    {
        $this->buffer->push($tenantId, $channel, $event, $payload);

        if (config('broadcasting.default') === 'null') {
            return;
        }

        broadcast(new RealtimeMessage($tenantId, $channel, $event, $payload));
    }

    public function emitOrderCreated(Order $order): void
    {
        $payload = [
            'order_id' => $order->id,
            'status' => $order->status,
            'total_amount' => (float) $order->total_amount,
            'order_type' => $order->order_type,
        ];

        $this->emit($order->tenant_id, 'admin', 'OrderCreated', $payload);
        $this->emit($order->tenant_id, 'kitchen', 'OrderCreated', $payload);
        $this->emit($order->tenant_id, 'customer', 'OrderCreated', $payload);
        $this->emitKitchenTicket($order);
        $this->maybeEmitDashboardMetrics($order->tenant_id);
    }

    public function emitOrderStatusChanged(Order $order, string $previousStatus): void
    {
        $payload = [
            'order_id' => $order->id,
            'status' => $order->status,
            'previous_status' => $previousStatus,
        ];

        $this->emit($order->tenant_id, 'admin', 'OrderStatusChanged', $payload);
        $this->emit($order->tenant_id, 'kitchen', 'OrderStatusChanged', $payload);
        $this->emit($order->tenant_id, 'customer', 'OrderStatusChanged', $payload);

        if (in_array($order->status, ['accepted', 'preparing'], true)) {
            $this->emitKitchenTicket($order);
        }

        $this->maybeEmitDashboardMetrics($order->tenant_id);
    }

    public function emitOrderCancelled(Order $order): void
    {
        $payload = [
            'order_id' => $order->id,
            'status' => 'cancelled',
        ];

        $this->emit($order->tenant_id, 'admin', 'OrderCancelled', $payload);
        $this->emit($order->tenant_id, 'kitchen', 'OrderCancelled', $payload);
        $this->emit($order->tenant_id, 'customer', 'OrderCancelled', $payload);
        $this->maybeEmitDashboardMetrics($order->tenant_id);
    }

    private function emitKitchenTicket(Order $order): void
    {
        $order->loadMissing('items');

        $mealIds = $order->items->pluck('meal_id')->filter()->unique();
        $names = Meal::withoutGlobalScopes()
            ->whereIn('id', $mealIds)
            ->pluck('name', 'id');

        $items = $order->items->map(fn ($item) => [
            'quantity' => $item->quantity,
            'name' => $names[$item->meal_id] ?? 'Item',
        ])->values()->all();

        $this->emit($order->tenant_id, 'kitchen', 'NewKitchenTicket', [
            'order_id' => $order->id,
            'status' => $order->status,
            'items' => $items,
        ]);
    }

    private function maybeEmitDashboardMetrics(string $tenantId): void
    {
        $debounce = (int) config('realtime.debounce.revenue_seconds', 3);
        $key = "realtime:debounce:dashboard:{$tenantId}";

        if (Cache::has($key)) {
            return;
        }

        Cache::put($key, true, now()->addSeconds($debounce));

        $today = now()->startOfDay();
        $revenue = (float) Order::withoutGlobalScopes()
            ->where('tenant_id', $tenantId)
            ->where('status', 'completed')
            ->where('created_at', '>=', $today)
            ->sum('total_amount');

        $ordersToday = Order::withoutGlobalScopes()
            ->where('tenant_id', $tenantId)
            ->where('created_at', '>=', $today)
            ->count();

        $pending = Order::withoutGlobalScopes()
            ->where('tenant_id', $tenantId)
            ->whereIn('status', ['pending', 'accepted', 'preparing', 'ready'])
            ->count();

        $this->emit($tenantId, 'admin', 'RevenueUpdated', ['revenue_today' => $revenue]);
        $this->emit($tenantId, 'admin', 'OrderCountUpdated', [
            'orders_today' => $ordersToday,
            'pending_count' => $pending,
        ]);
    }
}
