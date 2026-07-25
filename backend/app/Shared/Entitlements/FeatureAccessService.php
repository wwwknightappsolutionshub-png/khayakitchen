<?php

namespace App\Shared\Entitlements;

use App\Modules\Auth\Domain\Models\FeatureFlag;
use App\Modules\Auth\Domain\Models\User;
use App\Modules\Pricing\Application\Services\AuditLogService;
use App\Modules\Pricing\Application\Services\EntitlementOverrideService;
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
        'delivery' => 'delivery',
        'notifications' => 'pwa_push_notifications',
        'notifications.whatsapp' => 'whatsapp_notifications',
        'notifications.campaigns' => 'notification_campaigns',
        'reporting' => 'reports',
        'marketing' => 'campaigns',
        'pickup' => 'pickup',
        'coupons' => 'coupons',
        'revenue_recovery' => 'revenue_recovery',
        'accounting' => 'accounting',
        'forecasting' => 'forecasting',
        'api' => 'api_access',
        'marketplace' => 'marketplace',
        'white_label' => 'white_label',
        'ai' => 'ai',
        'platform_tenant_push' => 'platform_tenant_push',
        'platform_tenant_email' => 'platform_tenant_email',
        'platform_tenant_chat' => 'platform_tenant_chat',
        'tenant_customer_chat' => 'tenant_customer_chat',
        'menu_likes_refer' => 'menu_likes_refer',
        'kitchen_reviews' => 'kitchen_reviews',
        'custom_meal_requests' => 'custom_meal_requests',
        'staff_performance' => 'staff_performance',
        'seasonal_promo' => 'seasonal_promo',
        'campaign_timing_intelligence' => 'campaign_timing_intelligence',
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
        'delivery' => 'delivery',
        'pickup' => 'pickup',
        'coupons' => 'coupons',
        'revenue_recovery' => 'revenue_recovery',
        'campaigns' => 'marketing',
        'reports' => 'reporting',
        'accounting' => 'accounting',
        'forecasting' => 'forecasting',
        'api_access' => 'api',
        'marketplace' => 'marketplace',
        'white_label' => 'white_label',
        'ai' => 'ai',
        'platform_tenant_push' => 'platform_tenant_push',
        'platform_tenant_email' => 'platform_tenant_email',
        'platform_tenant_chat' => 'platform_tenant_chat',
        'tenant_customer_chat' => 'tenant_customer_chat',
        'menu_likes_refer' => 'menu_likes_refer',
        'kitchen_reviews' => 'kitchen_reviews',
        'custom_meal_requests' => 'custom_meal_requests',
        'staff_performance' => 'staff_performance',
        'seasonal_promo' => 'seasonal_promo',
        'campaign_timing_intelligence' => 'campaign_timing_intelligence',
    ];

    /**
     * Paid features free for all tiers during the shared first-30-days tenant trial.
     *
     * @var list<string>
     */
    public const SHARED_FREE_TRIAL_FEATURES = [
        'staff_performance',
        'seasonal_promo',
        'loyalty_system',
    ];

    public const FREE_TRIAL_DAYS = 30;

    public function __construct(
        private TenantContext $tenantContext,
        private AuditLogService $auditLogService,
        private EntitlementOverrideService $overrideService,
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

        $override = $this->overrideService->getActiveFeatureOverride($tenantId, $featureKey);
        if ($override !== null) {
            return $override;
        }

        // Shared first-30-days trial from tenant creation (same clock for all listed features).
        if (in_array($featureKey, self::SHARED_FREE_TRIAL_FEATURES, true) && $this->isInSharedFreeTrial($tenantId)) {
            return true;
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

    public function isInSharedFreeTrial(?string $tenantId = null): bool
    {
        $ends = $this->sharedFreeTrialEndsAt($tenantId);

        return $ends !== null && $ends->isFuture();
    }

    public function sharedFreeTrialEndsAt(?string $tenantId = null): ?\Carbon\Carbon
    {
        $tenantId = $tenantId ?? $this->tenantContext->id();
        if (! $tenantId) {
            return null;
        }

        $tenant = \App\Modules\Auth\Domain\Models\Tenant::withoutGlobalScopes()->find($tenantId);
        if (! $tenant?->created_at) {
            return null;
        }

        if ($tenant->trial_ends_at) {
            return $tenant->trial_ends_at->copy();
        }

        return $tenant->created_at->copy()->addDays(self::FREE_TRIAL_DAYS);
    }

    /**
     * Features that are only accessible via the shared trial (not on the active plan).
     *
     * @return list<string>
     */
    public function trialOnlyFeatures(?string $tenantId = null): array
    {
        $tenantId = $tenantId ?? $this->tenantContext->id();
        if (! $tenantId || ! $this->isInSharedFreeTrial($tenantId)) {
            return [];
        }

        $trialOnly = [];
        foreach (self::SHARED_FREE_TRIAL_FEATURES as $featureKey) {
            if ($this->planIncludesFeature($featureKey, $tenantId)) {
                continue;
            }
            $trialOnly[] = $featureKey;
        }

        return $trialOnly;
    }

    public function planIncludesFeature(string $featureKey, ?string $tenantId = null): bool
    {
        $tenantId = $tenantId ?? $this->tenantContext->id();
        if (! $tenantId) {
            return false;
        }

        $override = $this->overrideService->getActiveFeatureOverride($tenantId, $featureKey);
        if ($override === true) {
            return true;
        }

        $subscription = $this->getActiveSubscription($tenantId);
        if (! $subscription || $subscription->status === 'suspended') {
            return $this->legacyFlagEnabled($tenantId, $featureKey);
        }

        return $this->planHasFeature($subscription->plan_id, $featureKey);
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
        $base = $subscription
            ? PlanLimits::fromPlan(Plan::find($subscription->plan_id))
            : new PlanLimits();

        return $this->applyLimitOverrides($tenantId, $base);
    }

    public function getSubscriptionSummary(?string $tenantId = null): ?array
    {
        $tenantId = $tenantId ?? $this->tenantContext->id();
        if (! $tenantId) {
            return null;
        }

        $subscription = TenantSubscription::withoutGlobalScopes()
            ->with('plan')
            ->where('tenant_id', $tenantId)
            ->first();

        if (! $subscription) {
            return null;
        }

        return [
            'subscription' => $subscription,
            'plan' => $subscription->plan,
            'limits' => $this->getLimits($tenantId)?->toArray(),
            'unlimited' => $this->getLimits($tenantId)?->unlimitedToArray(),
        ];
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

            // Kitchen UI maps to the orders entitlement.
            $flags['kitchen'] = $flags['orders'] ?? $this->canAccess('orders', $tenantId);

            return $flags;
        });
    }

    public function clearCache(?string $tenantId): void
    {
        if ($tenantId) {
            Cache::forget("entitlements:legacy:{$tenantId}");
            Cache::forget("feature_flags:{$tenantId}");
            Cache::forget("entitlements:limits:{$tenantId}");
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

    private function applyLimitOverrides(string $tenantId, PlanLimits $base): PlanLimits
    {
        $unlimited = $base->unlimitedFlags;
        $values = $base->toArray();

        foreach (PlanLimits::LIMIT_KEYS as $key) {
            $override = $this->overrideService->getActiveLimitOverride($tenantId, $key);
            if (! $override) {
                continue;
            }
            if ($override->is_unlimited) {
                $unlimited[$key] = true;
            } elseif ($override->value_int !== null) {
                $unlimited[$key] = false;
                $values[$key] = $override->value_int;
            }
        }

        return new PlanLimits(
            maxMenuItems: $values['max_menu_items'] ?? $base->maxMenuItems,
            maxCategories: $values['max_categories'] ?? $base->maxCategories,
            maxStaff: $values['max_staff'] ?? $base->maxStaff,
            maxCampaignsPerMonth: $values['max_campaigns_per_month'] ?? $base->maxCampaignsPerMonth,
            maxPushNotificationsPerMonth: $values['max_push_notifications_per_month'] ?? $base->maxPushNotificationsPerMonth,
            maxStorageMb: $values['max_storage_mb'] ?? $base->maxStorageMb,
            maxImages: $values['max_images'] ?? $base->maxImages,
            maxBranches: $values['max_branches'] ?? $base->maxBranches,
            maxDrivers: $values['max_drivers'] ?? $base->maxDrivers,
            maxCustomers: $values['max_customers'] ?? $base->maxCustomers,
            maxProducts: $values['max_products'] ?? $base->maxProducts,
            maxLoyaltyMembers: $values['max_loyalty_members'] ?? $base->maxLoyaltyMembers,
            maxActivePromotions: $values['max_active_promotions'] ?? $base->maxActivePromotions,
            maxDeliveryZones: $values['max_delivery_zones'] ?? $base->maxDeliveryZones,
            maxOrdersPerDay: $values['max_orders_per_day'] ?? $base->maxOrdersPerDay,
            unlimitedFlags: $unlimited,
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
