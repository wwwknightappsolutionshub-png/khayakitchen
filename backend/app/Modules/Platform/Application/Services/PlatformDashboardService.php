<?php

namespace App\Modules\Platform\Application\Services;

use App\Modules\Auth\Domain\Models\Tenant;
use App\Modules\Orders\Domain\Models\Order;
use App\Modules\Platform\Infrastructure\Repositories\PlatformModuleRepository;

class PlatformDashboardService
{
    public function __construct(private PlatformModuleRepository $moduleRepository) {}

    public function overview(): array
    {
        $modules = $this->moduleRepository->all();
        $completed = $modules->where('status', 'completed')->count();
        $total = $modules->count();
        $completionPct = $total > 0 ? (int) round(($completed / $total) * 100) : 0;

        $totalTenants = Tenant::query()->count();
        $activeTenants = Tenant::query()->where('status', 'active')->count();
        $totalOrders = Order::withoutGlobalScopes()->count();

        return [
            'total_tenants' => $totalTenants,
            'active_tenants' => $activeTenants,
            'total_orders' => $totalOrders,
            'system_health' => 'healthy',
            'modules_completed_pct' => $completionPct,
            'modules_completed' => $completed,
            'modules_total' => $total,
        ];
    }
}
