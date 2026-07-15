<?php

namespace App\Modules\Pricing\Application\Services;

use App\Modules\Auth\Domain\Models\User;
use App\Modules\CRM\Domain\Models\Customer;
use App\Modules\Delivery\Domain\Models\DeliveryZone;
use App\Modules\Loyalty\Domain\Models\LoyaltyAccount;
use App\Modules\Menu\Domain\Models\Meal;
use App\Modules\Menu\Domain\Models\OptionGroup;
use App\Modules\NotificationsCampaign\Domain\Models\NotificationCampaign;
use App\Modules\Orders\Domain\Models\Order;
use App\Modules\Pricing\Domain\Models\Plan;
use App\Modules\Pricing\Domain\Models\TenantSubscription;
use App\Modules\Pricing\Domain\ValueObjects\PlanLimits;
use App\Modules\RevenueRecovery\Domain\Models\RevenueRecoveryCampaign;
use App\Modules\TenantBranding\Domain\Models\RestaurantStatus;
use App\Shared\Entitlements\FeatureAccessService;
use App\Shared\Tenancy\TenantContext;
use Illuminate\Validation\ValidationException;

class PlanLimitService
{
    public function __construct(
        private FeatureAccessService $featureAccess,
        private TenantContext $tenantContext,
    ) {}

    /**
     * @return array<string, array{current: int, max: int|null, unlimited: bool}>
     */
    public function getUsage(?string $tenantId = null): array
    {
        $tenantId = $tenantId ?? $this->tenantContext->id();
        $limits = $this->featureAccess->getLimits($tenantId);
        if (! $limits) {
            return [];
        }

        $counts = $this->getCurrentCounts($tenantId);

        $usage = [];
        foreach (PlanLimits::LIMIT_KEYS as $key) {
            $usage[$key] = [
                'current' => $counts[$key] ?? 0,
                'max' => $limits->valueFor($key),
                'unlimited' => $limits->isUnlimited($key),
            ];
        }

        return $usage;
    }

    public function assertMenuLimit(?string $tenantId = null): void
    {
        $this->assertLimit('max_menu_items', $tenantId);
    }

    public function assertCategoryLimit(?string $tenantId = null): void
    {
        $this->assertLimit('max_categories', $tenantId);
    }

    public function assertStaffLimit(?string $tenantId = null): void
    {
        $this->assertLimit('max_staff', $tenantId);
    }

    public function assertCampaignLimit(?string $tenantId = null): void
    {
        $this->assertLimit('max_campaigns_per_month', $tenantId);
    }

    public function assertPushNotificationLimit(?string $tenantId = null): void
    {
        $this->assertLimit('max_push_notifications_per_month', $tenantId);
    }

    public function assertImageLimit(?string $tenantId = null): void
    {
        $this->assertLimit('max_images', $tenantId);
    }

    public function assertDeliveryZoneLimit(?string $tenantId = null): void
    {
        $this->assertLimit('max_delivery_zones', $tenantId);
    }

    public function assertOrderLimit(?string $tenantId = null): void
    {
        $this->assertLimit('max_orders_per_day', $tenantId);
    }

    public function assertCustomerLimit(?string $tenantId = null): void
    {
        $this->assertLimit('max_customers', $tenantId);
    }

    public function assertProductLimit(?string $tenantId = null): void
    {
        $this->assertLimit('max_products', $tenantId);
    }

    public function assertLoyaltyMemberLimit(?string $tenantId = null): void
    {
        $this->assertLimit('max_loyalty_members', $tenantId);
    }

    public function assertPromotionLimit(?string $tenantId = null): void
    {
        $this->assertLimit('max_active_promotions', $tenantId);
    }

    public function getRecommendedPlan(string $limitKey, ?string $tenantId = null): ?Plan
    {
        $tenantId = $tenantId ?? $this->tenantContext->id();
        $usage = $this->getUsage($tenantId);
        $needed = ($usage[$limitKey]['current'] ?? 0) + 1;

        return Plan::query()
            ->where('is_active', true)
            ->orderBy('display_order')
            ->orderBy('price_monthly')
            ->get()
            ->first(function (Plan $plan) use ($limitKey, $needed) {
                $limits = PlanLimits::fromPlan($plan);
                $max = $limits->valueFor($limitKey);

                return $max === null || $max >= $needed;
            });
    }

    private function assertLimit(string $limitKey, ?string $tenantId = null): void
    {
        $tenantId = $tenantId ?? $this->tenantContext->id();
        $limits = $this->featureAccess->getLimits($tenantId);
        if (! $limits) {
            return;
        }

        if ($limits->isUnlimited($limitKey)) {
            return;
        }

        $max = $limits->valueFor($limitKey);
        if ($max === null) {
            return;
        }

        $counts = $this->getCurrentCounts($tenantId);
        $current = $counts[$limitKey] ?? 0;

        if ($current >= $max) {
            $recommended = $this->getRecommendedPlan($limitKey, $tenantId);
            throw ValidationException::withMessages([
                'limit' => [$this->limitMessage($limitKey, $current, $max)],
                'limit_key' => [$limitKey],
                'current_usage' => [(string) $current],
                'max_allowed' => [(string) $max],
                'recommended_plan_id' => [$recommended?->id ?? ''],
                'recommended_plan_name' => [$recommended?->name ?? ''],
            ]);
        }
    }

    /**
     * @return array<string, int>
     */
    private function getCurrentCounts(string $tenantId): array
    {
        $monthStart = now()->startOfMonth();

        return [
            'max_menu_items' => Meal::withoutGlobalScopes()
                ->where('tenant_id', $tenantId)
                ->whereNull('deleted_at')
                ->count(),
            'max_products' => Meal::withoutGlobalScopes()
                ->where('tenant_id', $tenantId)
                ->whereNull('deleted_at')
                ->count(),
            'max_categories' => OptionGroup::withoutGlobalScopes()->where('tenant_id', $tenantId)->count(),
            'max_staff' => User::withoutGlobalScopes()
                ->where('tenant_id', $tenantId)
                ->whereIn('role', ['owner', 'manager', 'kitchen', 'staff'])
                ->count(),
            'max_campaigns_per_month' => NotificationCampaign::withoutGlobalScopes()
                ->where('tenant_id', $tenantId)
                ->where('created_at', '>=', $monthStart)
                ->count(),
            'max_push_notifications_per_month' => NotificationCampaign::withoutGlobalScopes()
                ->where('tenant_id', $tenantId)
                ->where('channel', 'push')
                ->where('created_at', '>=', $monthStart)
                ->sum('sent_count'),
            'max_images' => Meal::withoutGlobalScopes()
                ->where('tenant_id', $tenantId)
                ->whereNotNull('image_url')
                ->count(),
            'max_storage_mb' => (int) ceil(
                Meal::withoutGlobalScopes()->where('tenant_id', $tenantId)->whereNotNull('image_url')->count() * 2
            ),
            'max_branches' => 1,
            'max_drivers' => User::withoutGlobalScopes()
                ->where('tenant_id', $tenantId)
                ->where('role', 'staff')
                ->count(),
            'max_customers' => Customer::withoutGlobalScopes()->where('tenant_id', $tenantId)->count(),
            'max_loyalty_members' => class_exists(LoyaltyAccount::class)
                ? LoyaltyAccount::withoutGlobalScopes()
                    ->where('tenant_id', $tenantId)
                    ->where('membership_status', 'active')
                    ->count()
                : Customer::withoutGlobalScopes()->where('tenant_id', $tenantId)->count(),
            'max_active_promotions' => RestaurantStatus::withoutGlobalScopes()
                ->where('tenant_id', $tenantId)
                ->where('status', 'promo_mode')
                ->count()
                + RevenueRecoveryCampaign::withoutGlobalScopes()
                    ->where('tenant_id', $tenantId)
                    ->whereIn('status', [
                        RevenueRecoveryCampaign::STATUS_ACTIVE,
                        RevenueRecoveryCampaign::STATUS_SCHEDULED,
                    ])
                    ->count(),
            'max_delivery_zones' => DeliveryZone::withoutGlobalScopes()->where('tenant_id', $tenantId)->count(),
            'max_orders_per_day' => Order::withoutGlobalScopes()
                ->where('tenant_id', $tenantId)
                ->where('created_at', '>=', now()->startOfDay())
                ->count(),
        ];
    }

    private function limitMessage(string $limitKey, int $current, int $max): string
    {
        $label = str_replace('_', ' ', str_replace('max_', '', $limitKey));

        return "Your current subscription allows up to {$max} {$label}. Upgrade your plan to add more.";
    }
}
