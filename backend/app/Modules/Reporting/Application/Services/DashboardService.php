<?php

namespace App\Modules\Reporting\Application\Services;

use App\Modules\CRM\Domain\Models\CrmProfile;
use App\Modules\Inventory\Domain\Models\InventoryItem;
use App\Modules\Orders\Domain\Models\Order;
use App\Shared\Auth\PermissionService;
use Illuminate\Support\Facades\DB;

class DashboardService
{
    public function __construct(private PermissionService $permissionService) {}

    public function kpis(array $permissions): array
    {
        $this->permissionService->authorize($permissions, 'dashboard.view');

        $today = now()->startOfDay();

        return [
            'revenue_today' => (float) Order::where('status', 'completed')
                ->where('created_at', '>=', $today)
                ->sum('total_amount'),
            'orders_today' => Order::where('created_at', '>=', $today)->count(),
            'active_customers' => CrmProfile::where('last_order_at', '>=', now()->subDays(30))->count(),
            'low_stock_items' => InventoryItem::whereColumn('current_stock', '<=', 'reorder_level')->count(),
        ];
    }

    public function salesTrends(array $permissions): array
    {
        $this->permissionService->authorize($permissions, 'dashboard.view');

        $trends = Order::select(
            DB::raw("date(created_at) as date"),
            DB::raw('SUM(total_amount) as revenue'),
            DB::raw('COUNT(*) as orders'),
        )
            ->where('status', 'completed')
            ->where('created_at', '>=', now()->subDays(7))
            ->groupBy('date')
            ->orderBy('date')
            ->get();

        return ['trends' => $trends];
    }

    public function inventoryHealth(array $permissions): array
    {
        $this->permissionService->authorize($permissions, 'dashboard.view');

        $items = InventoryItem::orderBy('current_stock')->get()->map(fn ($item) => [
            'id' => $item->id,
            'name' => $item->name,
            'current_stock' => (float) $item->current_stock,
            'reorder_level' => (float) $item->reorder_level,
            'status' => (float) $item->current_stock <= (float) $item->reorder_level ? 'low' : 'ok',
        ]);

        return ['items' => $items];
    }
}
