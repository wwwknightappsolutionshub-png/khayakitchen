<?php

namespace App\Shared\Entitlements;

use App\Modules\Auth\Domain\Models\FeatureFlag;
use App\Modules\Auth\Domain\Models\User;
use App\Modules\Pricing\Application\Services\AuditLogService;
use App\Modules\Pricing\Domain\Models\Feature;
use App\Modules\Pricing\Domain\Models\Plan;
use App\Modules\Pricing\Domain\Models\TenantSubscription;
use App\Modules\Pricing\Domain\ValueObjects\PlanLimits;
use App\Shared\Tenancy\TenantContext;
use Illuminate\Support\Facades\Cache;

class FeatureAccessService
{
  /** @var array<string, string> */
    public const MODULE_TO_FEATURE = [
        'menu' => 'menu_management',
        'orders' => 'orders',
        'inventory' => 'inventory_tracking',
        'crm' => 'crm_basic',
        'loyalty' => 'loyalty_system',
        'dashboard' => 'analytics_basic',
        'kitchen' => 'orders',
        'delivery' => 'orders',
        'notifications' => 'pwa_push_notifications',
        'notifications.whatsapp' => 'whatsapp_notifications',
        'notifications.campaigns' => 'notification_campaigns',
        'reporting' => 'analytics_basic',
    ];

  /** @var array<string, string> */
    public const FEATURE_TO_MODULE = [
        'menu_management' => 'menu',
        'orders' => 'orders',
        'inventory_tracking' => 'inventory',
        'crm_basic' => 'crm',
        'loyalty_system' => 'loyalty',
        'analytics_basic' => 'dashboard',
        'whatsapp_notifications' => 'notifications.whatsapp',
        'pwa_push_notifications' => 'notifications',
        'notification_campaigns' => 'notifications.campaigns',
    ];

    public function __construct(
        private TenantContext $tenantContext,
        private AuditLogService $auditLogService,
    ) {}

    public function canAccess(string $featureKey, ?string $tenantId = null, ?User $user = null): bool
    {
        $user = $user ?? $this->tenantContext->user();

        if ($user?->role === 'super_admin') {
            return true;
        }

        $tenantId = $tenantId ?? $this->tenantContext->id();
        if (! $tenantId) {
            return false;
        }

        $subscription = $this->getActiveSubscription($tenantId);
        if (! $subscription) {
            return $this->legacyFlagEnabled($tenantId, $featureKey);
        }

        if ($subscription->status === 'suspended') {
            return false;
        }

        return $this->planHasFeature($subscription->plan_id, $featureKey);
    }

    public function canAccessModule(string $module, ?string $tenantId = null, ?User $user = null): bool
    {
        $featureKey = self::MODULE_TO_FEATURE[$module] ?? $module;

        return $this->canAccess($featureKey, $tenantId, $user);
    }

    public function assertAccess(string $featureKey, ?string $tenantId = null, ?User $user = null): void
    {
        if (! $this->canAccess($featureKey, $tenantId, $user)) {
            abort(403, "Feature '{$featureKey}' is not available on your plan");
        }
    }

    public function getLimits(?string $tenantId = null): ?PlanLimits
    {
        $tenantId = $tenantId ?? $this->tenantContext->id();
        if (! $tenantId) {
            return null;
        }

        $subscription = $this->getActiveSubscription($tenantId);
        if (! $subscription) {
            return new PlanLimits(50, 500, 1000);
        }

        $plan = Plan::find($subscription->plan_id);
        if (! $plan) {
            return null;
        }

        return new PlanLimits(
            $plan->max_menu_items,
            $plan->max_orders_per_day,
            $plan->max_customers,
        );
    }

    /**
     * @return array<string, bool>
     */
    public function legacyFlagsForTenant(?string $tenantId = null): array
    {
        $tenantId = $tenantId ?? $this->tenantContext->id();
        if (! $tenantId) {
            return [];
        }

        return Cache::remember("entitlements:legacy:{$tenantId}", 60, function () use ($tenantId) {
            $flags = [];
            foreach (self::FEATURE_TO_MODULE as $featureKey => $moduleKey) {
                $flags[$moduleKey] = $this->canAccess($featureKey, $tenantId);
            }

            $flags['forecasting'] = false;

            return $flags;
        });
    }

    public function clearCache(?string $tenantId): void
    {
        if ($tenantId) {
            Cache::forget("entitlements:legacy:{$tenantId}");
            Cache::forget("feature_flags:{$tenantId}");
        }
    }

    public function logSuperAdminOverride(
        User $user,
        string $action,
        ?string $tenantId,
        array $metadata = [],
        ?string $reason = null,
    ): void {
        $this->auditLogService->log(
            $action,
            $tenantId,
            $user->id,
            'entitlement_override',
            null,
            $metadata,
            $reason,
        );
    }

    private function getActiveSubscription(string $tenantId): ?TenantSubscription
    {
        return TenantSubscription::withoutGlobalScopes()
            ->where('tenant_id', $tenantId)
            ->whereIn('status', ['active', 'trial'])
            ->first();
    }

    private function planHasFeature(string $planId, string $featureKey): bool
    {
        $feature = Feature::where('key', $featureKey)->first();
        if (! $feature) {
            return false;
        }

        return (bool) $feature->plans()
            ->where('plans.id', $planId)
            ->wherePivot('enabled', true)
            ->exists();
    }

    private function legacyFlagEnabled(string $tenantId, string $featureKey): bool
    {
        $moduleKey = self::FEATURE_TO_MODULE[$featureKey] ?? $featureKey;

        return (bool) FeatureFlag::withoutGlobalScopes()
            ->where('tenant_id', $tenantId)
            ->where('module', $moduleKey)
            ->value('enabled');
    }
}
