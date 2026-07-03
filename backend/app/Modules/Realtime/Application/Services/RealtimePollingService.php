<?php

namespace App\Modules\Realtime\Application\Services;

use App\Modules\Orders\Domain\Models\Order;
use App\Shared\Tenancy\TenantContext;
use Illuminate\Support\Carbon;

class RealtimePollingService
{
    public function __construct(
        private TenantContext $tenantContext,
        private RealtimeEventBuffer $buffer,
    ) {}

    public function orderUpdates(?string $since = null, ?string $channel = null): array
    {
        $tenantId = $this->tenantContext->id();

        return $this->buffer->since($tenantId, $since, $channel);
    }

    public function dashboardSummary(): array
    {
        $tenantId = $this->tenantContext->id();
        $today = now()->startOfDay();

        $revenue = (float) Order::where('status', 'completed')
            ->where('created_at', '>=', $today)
            ->sum('total_amount');

        $ordersToday = Order::where('created_at', '>=', $today)->count();

        $pending = Order::whereIn('status', ['pending', 'accepted', 'preparing', 'ready'])->count();

        return [
            'revenue_today' => $revenue,
            'orders_today' => $ordersToday,
            'pending_count' => $pending,
            'as_of' => now()->toIso8601String(),
        ];
    }

    public function orderStatus(string $orderId): ?array
    {
        $order = Order::find($orderId);

        if (! $order) {
            return null;
        }

        return [
            'order_id' => $order->id,
            'status' => $order->status,
            'updated_at' => Carbon::parse($order->updated_at)->toIso8601String(),
        ];
    }

    public function compactOrders(?string $sinceIso = null): array
    {
        $query = Order::query()->orderByDesc('updated_at');

        if ($sinceIso) {
            $query->where('updated_at', '>', Carbon::parse($sinceIso));
        } else {
            $query->where('created_at', '>=', now()->startOfDay());
        }

        $orders = $query->limit(50)->get(['id', 'status', 'total_amount', 'updated_at']);

        return [
            'orders' => $orders->map(fn ($o) => [
                'order_id' => $o->id,
                'status' => $o->status,
                'total_amount' => (float) $o->total_amount,
                'updated_at' => $o->updated_at?->toIso8601String(),
            ])->values()->all(),
            'as_of' => now()->toIso8601String(),
        ];
    }
}
