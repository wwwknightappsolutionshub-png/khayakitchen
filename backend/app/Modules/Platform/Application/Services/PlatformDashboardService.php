<?php

namespace App\Modules\Platform\Application\Services;

use App\Modules\Auth\Domain\Models\Tenant;
use App\Modules\Menu\Domain\Models\Meal;
use App\Modules\Orders\Domain\Models\Order;
use App\Modules\Platform\Infrastructure\Repositories\PlatformModuleRepository;
use App\Modules\Pricing\Domain\Models\Feature;
use App\Modules\Pricing\Domain\Models\Plan;
use App\Modules\Pricing\Domain\Models\TenantSubscription;
use App\Modules\Pricing\Domain\Models\UpgradeRequest;
use Illuminate\Support\Facades\DB;

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

        $subscriptions = TenantSubscription::with('plan')->get();
        $mrr = $subscriptions
            ->whereIn('status', ['active', 'trial'])
            ->sum(fn (TenantSubscription $s) => (float) ($s->plan?->price_monthly ?? 0));

        $planDistribution = $subscriptions
            ->groupBy('plan_id')
            ->map(fn ($group, $planId) => [
                'plan_id' => $planId,
                'plan_name' => $group->first()->plan?->name ?? 'Unknown',
                'count' => $group->count(),
            ])
            ->values();

        $expiredPlans = TenantSubscription::where('billing_status', 'overdue')
            ->orWhere(function ($q) {
                $q->whereNotNull('ends_at')->where('ends_at', '<', now());
            })
            ->count();

        $pendingRenewals = TenantSubscription::where('billing_status', 'pending_renewal')->count();

        $avgMenuCount = Meal::withoutGlobalScopes()
            ->select('tenant_id', DB::raw('count(*) as meal_count'))
            ->groupBy('tenant_id')
            ->get()
            ->avg('meal_count') ?? 0;

        $avgOrders = $totalTenants > 0 ? round($totalOrders / $totalTenants, 1) : 0;
        $avgRevenue = Order::withoutGlobalScopes()->avg('total_amount') ?? 0;

        $featureAdoption = Feature::withCount(['plans' => fn ($q) => $q->where('plan_features.enabled', true)])
            ->get()
            ->map(fn (Feature $f) => [
                'key' => $f->key,
                'name' => $f->name,
                'plan_count' => $f->plans_count,
            ]);

        $newestTenants = Tenant::orderByDesc('created_at')->limit(5)->get(['id', 'name', 'slug', 'status', 'created_at']);

        return [
            'total_tenants' => $totalTenants,
            'active_tenants' => $activeTenants,
            'total_orders' => $totalOrders,
            'system_health' => 'healthy',
            'modules_completed_pct' => $completionPct,
            'modules_completed' => $completed,
            'modules_total' => $total,
            'mrr' => round($mrr, 2),
            'arr' => round($mrr * 12, 2),
            'plan_distribution' => $planDistribution,
            'newest_tenants' => $newestTenants,
            'expired_plans' => $expiredPlans,
            'pending_renewals' => $pendingRenewals,
            'average_menu_count' => round($avgMenuCount, 1),
            'average_orders' => $avgOrders,
            'average_revenue' => round((float) $avgRevenue, 2),
            'feature_adoption' => $featureAdoption,
            'upgrade_requests' => UpgradeRequest::where('status', 'pending')->count(),
        ];
    }
}
