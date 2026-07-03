<?php

namespace App\Modules\Pricing\Application\Services;

use App\Modules\Auth\Domain\Models\FeatureFlag;
use App\Modules\Pricing\Domain\Models\Feature;
use App\Modules\Pricing\Domain\Models\Plan;
use App\Modules\Pricing\Domain\Models\TenantSubscription;
use App\Shared\Entitlements\FeatureAccessService;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class PlanService
{
    public function __construct(
        private AuditLogService $auditLogService,
        private FeatureAccessService $featureAccessService,
    ) {}

    public function listPlans(bool $visibleOnly = false)
    {
        $query = Plan::query()->with(['features'])->orderBy('price_monthly');

        if ($visibleOnly) {
            $query->where('is_visible', true)->where('is_active', true);
        }

        return $query->get();
    }

    public function createPlan(array $data, ?string $userId): Plan
    {
        $plan = Plan::create($data);

        $this->auditLogService->log('plan.created', null, $userId, 'plan', $plan->id, $data);

        return $plan->load('features');
    }

    public function updatePlan(string $id, array $data, ?string $userId): Plan
    {
        $plan = Plan::findOrFail($id);
        $plan->update($data);

        $this->auditLogService->log('plan.updated', null, $userId, 'plan', $plan->id, $data);

        return $plan->fresh(['features']);
    }

    public function deletePlan(string $id, ?string $userId): void
    {
        $plan = Plan::findOrFail($id);

        if (TenantSubscription::where('plan_id', $plan->id)->exists()) {
            throw ValidationException::withMessages([
                'plan' => ['Cannot delete a plan with active subscriptions.'],
            ]);
        }

        $plan->delete();
        $this->auditLogService->log('plan.deleted', null, $userId, 'plan', $id);
    }

    public function setVisibility(string $id, bool $visible, ?string $userId): Plan
    {
        $plan = Plan::findOrFail($id);
        $plan->update(['is_visible' => $visible]);

        $this->auditLogService->log('plan.visibility_changed', null, $userId, 'plan', $plan->id, [
            'is_visible' => $visible,
        ]);

        return $plan;
    }

    /**
     * @param  array<string, bool>  $featureMap  feature_id => enabled
     */
    public function syncPlanFeatures(string $planId, array $featureMap, ?string $userId): Plan
    {
        $plan = Plan::findOrFail($planId);

        DB::transaction(function () use ($plan, $featureMap, $userId) {
            $sync = [];
            foreach ($featureMap as $featureId => $enabled) {
                $sync[$featureId] = ['enabled' => (bool) $enabled];
            }
            $plan->features()->sync($sync);

            $this->auditLogService->log('plan.features_synced', null, $userId, 'plan', $plan->id, [
                'features' => $featureMap,
            ]);

            TenantSubscription::where('plan_id', $plan->id)->pluck('tenant_id')->each(function ($tenantId) {
                $this->syncTenantFlagsFromPlan($tenantId);
            });
        });

        return $plan->fresh(['features']);
    }

    public function syncTenantFlagsFromPlan(string $tenantId): void
    {
        $subscription = TenantSubscription::where('tenant_id', $tenantId)
            ->whereIn('status', ['active', 'trial'])
            ->first();

        if (! $subscription) {
            return;
        }

        $plan = Plan::with('features')->find($subscription->plan_id);
        if (! $plan) {
            return;
        }

        $enabledFeatures = $plan->features
            ->filter(fn (Feature $f) => (bool) $f->pivot->enabled)
            ->pluck('key')
            ->all();

        foreach (FeatureAccessService::FEATURE_TO_MODULE as $featureKey => $moduleKey) {
            FeatureFlag::withoutGlobalScopes()->updateOrCreate(
                ['tenant_id' => $tenantId, 'module' => $moduleKey],
                ['enabled' => in_array($featureKey, $enabledFeatures, true)],
            );
        }

        $this->featureAccessService->clearCache($tenantId);
    }
}
