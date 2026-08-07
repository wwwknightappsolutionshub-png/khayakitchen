<?php

namespace App\Modules\Pricing\Application\Services;

use App\Modules\Auth\Domain\Models\FeatureFlag;
use App\Modules\Pricing\Domain\Models\Feature;
use App\Modules\Pricing\Domain\Models\Plan;
use App\Modules\Pricing\Domain\Models\TenantSubscription;
use App\Shared\Entitlements\FeatureAccessService;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class PlanService
{
    public function __construct(
        private AuditLogService $auditLogService,
        private FeatureAccessService $featureAccessService,
    ) {}

    public function listPlans(bool $publicOnly = false, bool $includeArchived = false)
    {
        $query = Plan::query()->with(['features']);

        if ($includeArchived) {
            $query->withTrashed();
        }

        if ($publicOnly) {
            $query->where('is_visible', true)->where('is_active', true)->whereNull('deleted_at');
        }

        $plans = $query->orderBy('display_order')->orderBy('price_monthly')->get();

        // Public signup/pricing UI should not list duplicate slug rows if seed data was duplicated.
        if ($publicOnly) {
            return $plans->unique('slug')->values();
        }

        return $plans;
    }

    public function getPlan(string $id): Plan
    {
        return Plan::withTrashed()->with('features')->findOrFail($id);
    }

    public function createPlan(array $data, ?string $userId): Plan
    {
        if (empty($data['slug'])) {
            $data['slug'] = Str::slug($data['name']);
        }

        $plan = Plan::create($data);
        $this->auditLogService->log('plan.created', null, $userId, 'plan', $plan->id, $data);

        return $plan->load('features');
    }

    public function updatePlan(string $id, array $data, ?string $userId): Plan
    {
        $plan = Plan::withTrashed()->findOrFail($id);
        $plan->update($data);
        $this->auditLogService->log('plan.updated', null, $userId, 'plan', $plan->id, $data);

        return $plan->fresh(['features']);
    }

    public function deletePlan(string $id, ?string $userId): void
    {
        $plan = Plan::findOrFail($id);

        if (TenantSubscription::where('plan_id', $plan->id)->exists()) {
            throw ValidationException::withMessages([
                'plan' => ['Cannot delete a plan with active subscriptions. Archive it instead.'],
            ]);
        }

        $plan->delete();
        $this->auditLogService->log('plan.deleted', null, $userId, 'plan', $id);
    }

    public function archivePlan(string $id, ?string $userId): Plan
    {
        $plan = Plan::findOrFail($id);
        $plan->update(['is_active' => false]);
        $plan->delete();
        $this->auditLogService->log('plan.archived', null, $userId, 'plan', $plan->id);

        return $plan;
    }

    public function restorePlan(string $id, ?string $userId): Plan
    {
        $plan = Plan::withTrashed()->findOrFail($id);
        $plan->restore();
        $plan->update(['is_active' => true]);
        $this->auditLogService->log('plan.restored', null, $userId, 'plan', $plan->id);

        return $plan->fresh(['features']);
    }

    public function duplicatePlan(string $id, ?string $userId): Plan
    {
        $source = Plan::with('features')->findOrFail($id);

        return DB::transaction(function () use ($source, $userId) {
            $copy = Plan::create([
                ...$source->only($source->getFillable()),
                'name' => $source->name.' Copy',
                'slug' => Str::slug($source->name.'-copy-'.Str::random(4)),
                'is_recommended' => false,
            ]);

            $sync = [];
            foreach ($source->features as $feature) {
                $sync[$feature->id] = ['enabled' => (bool) $feature->pivot->enabled];
            }
            $copy->features()->sync($sync);

            $this->auditLogService->log('plan.duplicated', null, $userId, 'plan', $copy->id, [
                'source_plan_id' => $source->id,
            ]);

            return $copy->load('features');
        });
    }

    /**
     * @param  list<string>  $orderedIds
     */
    public function reorderPlans(array $orderedIds, ?string $userId): void
    {
        DB::transaction(function () use ($orderedIds, $userId) {
            foreach ($orderedIds as $index => $planId) {
                Plan::withTrashed()->where('id', $planId)->update(['display_order' => $index]);
            }

            $this->auditLogService->log('plan.reordered', null, $userId, 'plan', null, [
                'order' => $orderedIds,
            ]);
        });
    }

    public function setVisibility(string $id, bool $visible, ?string $userId): Plan
    {
        $plan = Plan::withTrashed()->findOrFail($id);
        $plan->update(['is_visible' => $visible]);
        $this->auditLogService->log('plan.visibility_changed', null, $userId, 'plan', $plan->id, [
            'is_visible' => $visible,
        ]);

        return $plan;
    }

    public function setActive(string $id, bool $active, ?string $userId): Plan
    {
        $plan = Plan::withTrashed()->findOrFail($id);
        $plan->update(['is_active' => $active]);
        $this->auditLogService->log($active ? 'plan.activated' : 'plan.deactivated', null, $userId, 'plan', $plan->id);

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
