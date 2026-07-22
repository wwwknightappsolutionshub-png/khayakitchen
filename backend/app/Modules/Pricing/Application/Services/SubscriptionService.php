<?php

namespace App\Modules\Pricing\Application\Services;

use App\Modules\Auth\Domain\Models\Tenant;
use App\Modules\Menu\Domain\Models\Meal;
use App\Modules\Orders\Domain\Models\Order;
use App\Modules\Pricing\Domain\Models\Plan;
use App\Modules\Pricing\Domain\Models\SubscriptionHistory;
use App\Modules\Pricing\Domain\Models\TenantSubscription;
use App\Modules\Pricing\Domain\Models\UpgradeRequest;
use App\Shared\Entitlements\FeatureAccessService;
use Illuminate\Support\Str;

class SubscriptionService
{
    public function __construct(
        private PlanService $planService,
        private AuditLogService $auditLogService,
        private FeatureAccessService $featureAccessService,
        private EntitlementOverrideService $overrideService,
    ) {}

    public function listSubscriptions()
    {
        return TenantSubscription::with(['plan', 'tenant'])->orderByDesc('created_at')->get();
    }

    public function getTenantEntitlements(string $tenantId): array
    {
        $subscription = TenantSubscription::with('plan')->where('tenant_id', $tenantId)->first();
        $history = SubscriptionHistory::where('tenant_id', $tenantId)->orderByDesc('created_at')->limit(20)->get();
        $overrides = $this->overrideService->listForTenant($tenantId);

        return [
            'subscription' => $subscription,
            'plan' => $subscription?->plan,
            'history' => $history,
            'overrides' => $overrides,
        ];
    }

    public function assignPlan(
        string $tenantId,
        string $planId,
        string $status = 'active',
        ?string $userId = null,
        ?string $reason = null,
        ?string $billingStatus = 'current',
    ): TenantSubscription {
        Tenant::withoutGlobalScopes()->findOrFail($tenantId);
        Plan::findOrFail($planId);

        $previous = TenantSubscription::where('tenant_id', $tenantId)->first();
        $previousPlanId = $previous?->plan_id;

        $subscription = TenantSubscription::updateOrCreate(
            ['tenant_id' => $tenantId],
            [
                'plan_id' => $planId,
                'status' => $status,
                'billing_status' => $billingStatus,
                'started_at' => $previous?->started_at ?? now(),
                'ends_at' => null,
            ],
        );

        $this->planService->syncTenantFlagsFromPlan($tenantId);

        $action = $previousPlanId ? 'subscription.changed' : 'subscription.assigned';
        if ($previousPlanId && $previousPlanId !== $planId) {
            $action = ((float) Plan::find($planId)?->price_monthly) > ((float) Plan::find($previousPlanId)?->price_monthly)
                ? 'tenant.upgraded'
                : 'tenant.downgraded';
        }

        SubscriptionHistory::create([
            'id' => (string) Str::uuid(),
            'tenant_id' => $tenantId,
            'plan_id' => $planId,
            'previous_plan_id' => $previousPlanId,
            'action' => $action,
            'metadata' => ['status' => $status, 'billing_status' => $billingStatus],
            'created_by' => $userId,
            'created_at' => now(),
        ]);

        $this->auditLogService->log(
            $action,
            $tenantId,
            $userId,
            'tenant_subscription',
            $subscription->id,
            [
                'plan_id' => $planId,
                'previous_plan_id' => $previousPlanId,
                'status' => $status,
            ],
            $reason,
        );

        return $subscription->load(['plan', 'tenant']);
    }

    public function updateStatus(
        string $tenantId,
        string $status,
        ?string $userId = null,
        ?string $reason = null,
        ?string $billingStatus = null,
    ): TenantSubscription {
        $subscription = TenantSubscription::where('tenant_id', $tenantId)->firstOrFail();
        $updates = ['status' => $status];
        if ($billingStatus) {
            $updates['billing_status'] = $billingStatus;
        }
        $subscription->update($updates);

        if ($status === 'suspended') {
            Tenant::withoutGlobalScopes()->where('id', $tenantId)->update(['status' => 'suspended']);
        } elseif ($status === 'active') {
            Tenant::withoutGlobalScopes()->where('id', $tenantId)->update(['status' => 'active']);
        }

        $this->featureAccessService->clearCache($tenantId);

        $this->auditLogService->log(
            'subscription.status_changed',
            $tenantId,
            $userId,
            'tenant_subscription',
            $subscription->id,
            ['status' => $status, 'billing_status' => $billingStatus],
            $reason,
        );

        return $subscription->fresh(['plan', 'tenant']);
    }

    /**
     * Extend shared free-access window (trial_ends_at) by N days.
     * Used for referral referee trial and referrer reward.
     */
    public function extendFreeAccess(
        string $tenantId,
        int $days,
        ?string $userId = null,
        ?string $reason = null,
        bool $setSubscriptionTrial = false,
    ): Tenant {
        $tenant = Tenant::withoutGlobalScopes()->findOrFail($tenantId);
        $days = max(1, $days);

        $defaultEnd = $tenant->created_at
            ? $tenant->created_at->copy()->addDays(FeatureAccessService::FREE_TRIAL_DAYS)
            : now()->addDays(FeatureAccessService::FREE_TRIAL_DAYS);

        $currentEnd = $tenant->trial_ends_at && $tenant->trial_ends_at->isFuture()
            ? $tenant->trial_ends_at->copy()
            : ($defaultEnd->isFuture() ? $defaultEnd : now());

        $newEnd = $currentEnd->copy()->addDays($days);
        $tenant->trial_ends_at = $newEnd;
        $tenant->save();

        $subscription = TenantSubscription::where('tenant_id', $tenantId)->first();
        if ($subscription) {
            $updates = ['ends_at' => $newEnd];
            if ($setSubscriptionTrial || $subscription->status === 'trial') {
                $updates['status'] = 'trial';
            }
            $subscription->update($updates);
        }

        $this->featureAccessService->clearCache($tenantId);

        $this->auditLogService->log(
            'subscription.free_access_extended',
            $tenantId,
            $userId,
            'tenant',
            $tenantId,
            ['days' => $days, 'trial_ends_at' => $newEnd->toIso8601String()],
            $reason,
        );

        SubscriptionHistory::create([
            'id' => (string) Str::uuid(),
            'tenant_id' => $tenantId,
            'plan_id' => $subscription?->plan_id,
            'previous_plan_id' => $subscription?->plan_id,
            'action' => 'free_access_extended',
            'metadata' => ['days' => $days, 'trial_ends_at' => $newEnd->toIso8601String()],
            'created_by' => $userId,
            'created_at' => now(),
        ]);

        return $tenant->fresh();
    }

    public function createUpgradeRequest(
        string $tenantId,
        ?string $requestedPlanId,
        ?string $message,
        ?string $userId,
    ): UpgradeRequest {
        $subscription = TenantSubscription::where('tenant_id', $tenantId)->first();

        $request = UpgradeRequest::create([
            'tenant_id' => $tenantId,
            'current_plan_id' => $subscription?->plan_id,
            'requested_plan_id' => $requestedPlanId,
            'status' => 'pending',
            'message' => $message,
            'created_by' => $userId,
        ]);

        $this->auditLogService->log(
            'upgrade.requested',
            $tenantId,
            $userId,
            'upgrade_request',
            $request->id,
            ['requested_plan_id' => $requestedPlanId],
        );

        return $request;
    }

    public function listUpgradeRequests(?string $status = null)
    {
        $query = UpgradeRequest::with(['tenant', 'requestedPlan', 'currentPlan'])->orderByDesc('created_at');
        if ($status) {
            $query->where('status', $status);
        }

        return $query->get();
    }
}
