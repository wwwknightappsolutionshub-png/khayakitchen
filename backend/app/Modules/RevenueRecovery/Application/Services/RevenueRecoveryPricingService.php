<?php

namespace App\Modules\RevenueRecovery\Application\Services;

use App\Modules\Menu\Domain\Models\Meal;
use App\Modules\RevenueRecovery\Domain\Models\RevenueRecoveryCampaign;
use App\Modules\TenantBranding\Application\Services\RestaurantStatusService;
use App\Modules\TenantBranding\Domain\Models\RestaurantStatus;

class RevenueRecoveryPricingService
{
    public function __construct(
        private RestaurantStatusService $restaurantStatusService,
    ) {}

    /**
     * @return array<int, array<string, mixed>>
     */
    public function getStorefrontOffers(?string $tenantId = null): array
    {
        $tenantId = $tenantId ?? app(\App\Shared\Tenancy\TenantContext::class)->id();
        $offers = [];

        foreach ($this->getActiveCampaigns($tenantId) as $campaign) {
            foreach ($this->resolveCampaignOffers($campaign, $tenantId) as $offer) {
                $offers[] = $offer;
            }
        }

        $statusOffers = $this->resolveStatusPromoOffers($tenantId);
        foreach ($statusOffers as $offer) {
            $existing = collect($offers)->first(fn ($o) => $o['meal_id'] === $offer['meal_id']);
            if (! $existing || $offer['promo_price'] < $existing['promo_price']) {
                $offers = collect($offers)
                    ->reject(fn ($o) => $o['meal_id'] === $offer['meal_id'])
                    ->push($offer)
                    ->values()
                    ->all();
            }
        }

        return $offers;
    }

    /**
     * @return array{campaign: RevenueRecoveryCampaign|null, unit_price: float, discount_amount: float, original_base: float}
     */
    public function resolveLinePricing(Meal $meal, float $optionDelta, int $quantity, ?string $tenantId = null): array
    {
        $tenantId = $tenantId ?? $meal->tenant_id;
        $basePrice = (float) $meal->base_price;
        $best = [
            'campaign' => null,
            'unit_price' => $basePrice + $optionDelta,
            'discount_amount' => 0.0,
            'original_base' => $basePrice,
        ];

        foreach ($this->getActiveCampaigns($tenantId) as $campaign) {
            if (! $this->campaignAppliesToMeal($campaign, $meal)) {
                continue;
            }

            $discountedBase = $this->applyDiscount($basePrice, $campaign->discount_type, (float) $campaign->discount_value);
            $unitPrice = $discountedBase + $optionDelta;
            $discountPerUnit = max(0, $basePrice - $discountedBase);

            if ($discountPerUnit > $best['discount_amount']) {
                $best = [
                    'campaign' => $campaign,
                    'unit_price' => $unitPrice,
                    'discount_amount' => $discountPerUnit,
                    'original_base' => $basePrice,
                ];
            }
        }

        $status = $this->restaurantStatusService->getForTenant($tenantId);
        if ($status->status === RestaurantStatus::STATUS_PROMO_MODE) {
            foreach ($status->promo_meals ?? [] as $item) {
                if (($item['meal_id'] ?? null) !== $meal->id) {
                    continue;
                }

                $percent = max(1, min(90, (int) ($item['discount_percent'] ?? 10)));
                $discountedBase = $this->applyDiscount($basePrice, RevenueRecoveryCampaign::DISCOUNT_PERCENT, $percent);
                $discountPerUnit = max(0, $basePrice - $discountedBase);

                if ($discountPerUnit > $best['discount_amount']) {
                    $best = [
                        'campaign' => null,
                        'unit_price' => $discountedBase + $optionDelta,
                        'discount_amount' => $discountPerUnit,
                        'original_base' => $basePrice,
                    ];
                }
            }
        }

        return $best;
    }

    /**
     * @return \Illuminate\Support\Collection<int, RevenueRecoveryCampaign>
     */
    public function getActiveCampaigns(?string $tenantId = null)
    {
        $tenantId = $tenantId ?? app(\App\Shared\Tenancy\TenantContext::class)->id();

        return RevenueRecoveryCampaign::withoutGlobalScopes()
            ->where('tenant_id', $tenantId)
            ->where('status', RevenueRecoveryCampaign::STATUS_ACTIVE)
            ->where('campaign_type', '!=', RevenueRecoveryCampaign::TYPE_PROXIMITY)
            ->where('starts_at', '<=', now())
            ->where('ends_at', '>=', now())
            ->where(function ($query) {
                $query->whereNull('redemption_limit')
                    ->orWhereColumn('redemption_count', '<', 'redemption_limit');
            })
            ->orderBy('starts_at')
            ->get();
    }

    public function applyDiscount(float $basePrice, string $discountType, float $discountValue): float
    {
        if ($discountType === RevenueRecoveryCampaign::DISCOUNT_FIXED) {
            return max(0, round($basePrice - $discountValue, 2));
        }

        $percent = max(1, min(90, (int) $discountValue));

        return round($basePrice * (1 - $percent / 100), 2);
    }

    private function campaignAppliesToMeal(RevenueRecoveryCampaign $campaign, Meal $meal): bool
    {
        $mealIds = $campaign->meal_ids ?? [];
        if ($mealIds !== [] && in_array($meal->id, $mealIds, true)) {
            return true;
        }

        return $mealIds === [] && ($campaign->category_ids ?? []) === [];
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function resolveCampaignOffers(RevenueRecoveryCampaign $campaign, string $tenantId): array
    {
        $mealIds = $campaign->meal_ids ?? [];
        if ($mealIds === []) {
            return [];
        }

        $meals = Meal::withoutGlobalScopes()
            ->where('tenant_id', $tenantId)
            ->whereIn('id', $mealIds)
            ->where('is_active', true)
            ->get();

        $offers = [];
        foreach ($meals as $meal) {
            $base = (float) $meal->base_price;
            $promo = $this->applyDiscount($base, $campaign->discount_type, (float) $campaign->discount_value);
            $offers[] = [
                'campaign_id' => $campaign->id,
                'campaign_name' => $campaign->name,
                'campaign_type' => $campaign->campaign_type,
                'meal_id' => $meal->id,
                'name' => $meal->name,
                'description' => $meal->description,
                'image_url' => $meal->image_url,
                'base_price' => $base,
                'promo_price' => $promo,
                'discount_percent' => $campaign->discount_type === RevenueRecoveryCampaign::DISCOUNT_PERCENT
                    ? (int) $campaign->discount_value
                    : (int) round((1 - $promo / max($base, 0.01)) * 100),
                'ends_at' => $campaign->ends_at?->toIso8601String(),
            ];
        }

        return $offers;
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function resolveStatusPromoOffers(string $tenantId): array
    {
        $status = $this->restaurantStatusService->getForTenant($tenantId);
        if ($status->status !== RestaurantStatus::STATUS_PROMO_MODE) {
            return [];
        }

        $storefront = $this->restaurantStatusService->getStorefront($tenantId);
        $promoMeals = $storefront['status']['promo_meals'] ?? [];
        $promoEndsAt = $storefront['status']['promo_ends_at'] ?? null;

        return array_map(function (array $item) use ($promoEndsAt) {
            return [
                'campaign_id' => null,
                'campaign_name' => 'Promo Mode',
                'campaign_type' => 'promo_mode',
                'meal_id' => $item['meal_id'],
                'name' => $item['name'] ?? '',
                'description' => $item['description'] ?? null,
                'image_url' => $item['image_url'] ?? null,
                'base_price' => (float) ($item['base_price'] ?? 0),
                'promo_price' => (float) ($item['promo_price'] ?? 0),
                'discount_percent' => (int) ($item['discount_percent'] ?? 0),
                'ends_at' => $promoEndsAt,
            ];
        }, $promoMeals);
    }
}
