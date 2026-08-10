<?php

namespace App\Modules\StaffPerformance\Application\Services;

use App\Modules\Auth\Domain\Models\Tenant;
use App\Modules\Auth\Domain\Models\User;
use App\Modules\Orders\Domain\Models\Order;
use App\Modules\StaffPerformance\Domain\Models\OrderStatusEvent;
use App\Shared\Auth\PermissionService;
use App\Shared\Entitlements\FeatureAccessService;
use App\Shared\Tenancy\TenantContext;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class StaffPerformanceService
{
    public const FEATURE_KEY = 'staff_performance';

    public const MODULE = 'staff_performance';

    public function __construct(
        private TenantContext $tenantContext,
        private PermissionService $permissionService,
        private FeatureAccessService $featureAccessService,
    ) {}

    /**
     * @return array{
     *   from: string,
     *   to: string,
     *   free_until: string|null,
     *   entitled: bool,
     *   waiters: list<array<string, mixed>>,
     *   chefs: list<array<string, mixed>>,
     *   daily: list<array<string, mixed>>
     * }
     */
    public function overview(array $permissions, ?string $from = null, ?string $to = null, ?string $role = null): array
    {
        $this->assertManagerAccess($permissions);

        [$fromDate, $toDate] = $this->resolveRange($from, $to);
        $tenantId = $this->tenantContext->id();
        $tenant = Tenant::withoutGlobalScopes()->find($tenantId);
        $freeUntil = $tenant?->created_at?->copy()->addDays(30);
        $entitled = $this->featureAccessService->canAccess(self::FEATURE_KEY, $tenantId);

        if (! $entitled) {
            abort(403, $this->featureAccessService->unavailableForKitchenMessage(self::FEATURE_KEY));
        }

        $roles = match ($role) {
            'waiter', 'staff' => ['staff'],
            'chef', 'kitchen' => ['kitchen'],
            default => ['staff', 'kitchen'],
        };

        $users = User::where('tenant_id', $tenantId)
            ->whereIn('role', $roles)
            ->where('status', 'active')
            ->orderBy('name')
            ->get(['id', 'name', 'email', 'role']);

        $waiters = [];
        $chefs = [];

        foreach ($users as $user) {
            $row = $this->metricsForUser($user, $fromDate, $toDate);
            if ($user->role === 'staff') {
                $waiters[] = $row;
            } else {
                $chefs[] = $row;
            }
        }

        return [
            'from' => $fromDate->toDateString(),
            'to' => $toDate->toDateString(),
            'free_until' => $freeUntil?->toDateString(),
            'entitled' => $entitled,
            'waiters' => $waiters,
            'chefs' => $chefs,
            'daily' => $this->dailySeries($tenantId, $fromDate, $toDate, $roles),
        ];
    }

    private function assertManagerAccess(array $permissions): void
    {
        $user = auth('sanctum')->user() ?? $this->tenantContext->user();
        if (! $user || ! in_array($user->role, ['owner', 'manager', 'super_admin'], true)) {
            abort(403, 'Only owners and managers can view staff performance');
        }

        $this->permissionService->authorize($permissions, 'dashboard.view');
        $this->featureAccessService->assertAccess(self::FEATURE_KEY);
    }

    /**
     * @return array{0: Carbon, 1: Carbon}
     */
    private function resolveRange(?string $from, ?string $to): array
    {
        $toDate = $to ? Carbon::parse($to)->endOfDay() : now()->endOfDay();
        $fromDate = $from ? Carbon::parse($from)->startOfDay() : $toDate->copy()->subDays(6)->startOfDay();

        if ($fromDate->gt($toDate)) {
            throw ValidationException::withMessages(['from' => ['Start date must be before end date.']]);
        }

        if ($fromDate->diffInDays($toDate) > 90) {
            throw ValidationException::withMessages(['from' => ['Maximum range is 90 days.']]);
        }

        return [$fromDate, $toDate];
    }

    /**
     * @return array<string, mixed>
     */
    private function metricsForUser(User $user, Carbon $from, Carbon $to): array
    {
        if ($user->role === 'staff') {
            $orders = Order::query()
                ->where('created_by', $user->id)
                ->whereBetween('created_at', [$from, $to])
                ->get(['id', 'customer_id', 'created_at', 'accepted_at', 'completed_at', 'status']);

            $completed = $orders->where('status', 'completed')->filter(fn (Order $o) => $o->completed_at);
            $durations = $completed->map(function (Order $o) {
                $start = $o->accepted_at ?? $o->created_at;

                return $start && $o->completed_at ? $start->diffInSeconds($o->completed_at) : null;
            })->filter(fn ($v) => $v !== null);

            return [
                'user_id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'role' => $user->role,
                'role_label' => 'Waiter',
                'orders_handled' => $orders->count(),
                'customers_served' => $orders->pluck('customer_id')->filter()->unique()->count(),
                'completed_orders' => $completed->count(),
                'avg_handle_minutes' => $durations->count() > 0
                    ? round($durations->avg() / 60, 1)
                    : null,
            ];
        }

        $acceptedOrders = Order::query()
            ->where(function ($q) use ($user) {
                $q->where('accepted_by', $user->id)
                    ->orWhere('completed_by', $user->id);
            })
            ->whereBetween('updated_at', [$from, $to])
            ->get(['id', 'customer_id', 'accepted_at', 'completed_at', 'status', 'accepted_by', 'completed_by']);

        $eventOrderIds = OrderStatusEvent::query()
            ->where('user_id', $user->id)
            ->whereBetween('created_at', [$from, $to])
            ->whereIn('to_status', ['accepted', 'preparing', 'ready', 'completed'])
            ->pluck('order_id')
            ->unique();

        $eventOrders = Order::query()
            ->whereIn('id', $eventOrderIds)
            ->get(['id', 'customer_id', 'accepted_at', 'completed_at', 'status']);

        $merged = $acceptedOrders->concat($eventOrders)->unique('id');
        $completed = $merged->where('status', 'completed')->filter(fn (Order $o) => $o->completed_at && $o->accepted_at);
        $durations = $completed->map(fn (Order $o) => $o->accepted_at->diffInSeconds($o->completed_at));

        return [
            'user_id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'role' => $user->role,
            'role_label' => 'Chef',
            'orders_handled' => $merged->count(),
            'customers_served' => $merged->pluck('customer_id')->filter()->unique()->count(),
            'completed_orders' => $completed->count(),
            'avg_handle_minutes' => $durations->count() > 0
                ? round($durations->avg() / 60, 1)
                : null,
        ];
    }

    /**
     * @param  list<string>  $roles
     * @return list<array<string, mixed>>
     */
    private function dailySeries(string $tenantId, Carbon $from, Carbon $to, array $roles): array
    {
        $staffIds = User::where('tenant_id', $tenantId)
            ->whereIn('role', $roles)
            ->pluck('id');

        $rows = OrderStatusEvent::query()
            ->where('tenant_id', $tenantId)
            ->whereIn('user_id', $staffIds)
            ->whereBetween('created_at', [$from, $to])
            ->whereIn('to_status', ['accepted', 'preparing', 'ready', 'completed'])
            ->selectRaw("DATE(created_at) as day, COUNT(DISTINCT order_id) as orders_touched")
            ->groupBy(DB::raw('DATE(created_at)'))
            ->orderBy('day')
            ->get();

        $waiterCreates = Order::query()
            ->whereIn('created_by', User::where('tenant_id', $tenantId)->where('role', 'staff')->pluck('id'))
            ->whereBetween('created_at', [$from, $to])
            ->selectRaw("DATE(created_at) as day, COUNT(*) as waiter_orders")
            ->groupBy(DB::raw('DATE(created_at)'))
            ->pluck('waiter_orders', 'day');

        $map = [];
        foreach ($rows as $row) {
            $map[$row->day] = [
                'date' => $row->day,
                'orders_touched' => (int) $row->orders_touched,
                'waiter_orders' => (int) ($waiterCreates[$row->day] ?? 0),
            ];
        }

        foreach ($waiterCreates as $day => $count) {
            if (! isset($map[$day])) {
                $map[$day] = [
                    'date' => $day,
                    'orders_touched' => 0,
                    'waiter_orders' => (int) $count,
                ];
            }
        }

        ksort($map);

        return array_values($map);
    }
}
