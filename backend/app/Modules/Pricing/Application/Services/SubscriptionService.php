<?php

namespace App\Modules\Pricing\Application\Services;

use App\Modules\Auth\Domain\Models\Tenant;
use App\Modules\Pricing\Domain\Models\Plan;
use App\Modules\Pricing\Domain\Models\TenantSubscription;
use App\Shared\Entitlements\FeatureAccessService;

class SubscriptionService
{
    public function __construct(
        private PlanService $planService,
        private AuditLogService $auditLogService,
        private FeatureAccessService $featureAccessService,
    ) {}

    public function listSubscriptions()
    {
        return TenantSubscription::with(['plan', 'tenant'])->orderByDesc('created_at')->get();
    }

    public function assignPlan(
        string $tenantId,
        string $planId,
        string $status = 'active',
        ?string $userId = null,
        ?string $reason = null,
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
                'started_at' => $previous?->started_at ?? now(),
                'ends_at' => null,
            ],
        );

        $this->planService->syncTenantFlagsFromPlan($tenantId);

        $action = $previousPlanId ? 'subscription.changed' : 'subscription.assigned';
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
    ): TenantSubscription {
        $subscription = TenantSubscription::where('tenant_id', $tenantId)->firstOrFail();
        $subscription->update(['status' => $status]);

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
            ['status' => $status],
            $reason,
        );

        return $subscription->fresh(['plan', 'tenant']);
    }
}
