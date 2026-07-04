<?php

namespace App\Modules\Pricing\Domain\ValueObjects;

class PlanLimits
{
    /** @var list<string> */
    public const LIMIT_KEYS = [
        'max_menu_items',
        'max_categories',
        'max_staff',
        'max_campaigns_per_month',
        'max_push_notifications_per_month',
        'max_storage_mb',
        'max_images',
        'max_branches',
        'max_drivers',
        'max_customers',
        'max_products',
        'max_loyalty_members',
        'max_active_promotions',
        'max_delivery_zones',
        'max_orders_per_day',
    ];

    /** @param array<string, bool> $unlimitedFlags */
    public function __construct(
        public int $maxMenuItems = 50,
        public int $maxCategories = 10,
        public int $maxStaff = 5,
        public int $maxCampaignsPerMonth = 10,
        public int $maxPushNotificationsPerMonth = 1000,
        public int $maxStorageMb = 500,
        public int $maxImages = 50,
        public int $maxBranches = 1,
        public int $maxDrivers = 5,
        public int $maxCustomers = 1000,
        public int $maxProducts = 50,
        public int $maxLoyaltyMembers = 500,
        public int $maxActivePromotions = 3,
        public int $maxDeliveryZones = 5,
        public int $maxOrdersPerDay = 500,
        public array $unlimitedFlags = [],
    ) {}

    public static function fromPlan(object $plan): self
    {
        $unlimited = is_array($plan->unlimited_flags ?? null) ? $plan->unlimited_flags : [];

        return new self(
            maxMenuItems: (int) ($plan->max_menu_items ?? 50),
            maxCategories: (int) ($plan->max_categories ?? 10),
            maxStaff: (int) ($plan->max_staff ?? 5),
            maxCampaignsPerMonth: (int) ($plan->max_campaigns_per_month ?? 10),
            maxPushNotificationsPerMonth: (int) ($plan->max_push_notifications_per_month ?? 1000),
            maxStorageMb: (int) ($plan->max_storage_mb ?? 500),
            maxImages: (int) ($plan->max_images ?? 50),
            maxBranches: (int) ($plan->max_branches ?? 1),
            maxDrivers: (int) ($plan->max_drivers ?? 5),
            maxCustomers: (int) ($plan->max_customers ?? 1000),
            maxProducts: (int) ($plan->max_products ?? 50),
            maxLoyaltyMembers: (int) ($plan->max_loyalty_members ?? 500),
            maxActivePromotions: (int) ($plan->max_active_promotions ?? 3),
            maxDeliveryZones: (int) ($plan->max_delivery_zones ?? 5),
            maxOrdersPerDay: (int) ($plan->max_orders_per_day ?? 500),
            unlimitedFlags: $unlimited,
        );
    }

    public function isUnlimited(string $key): bool
    {
        return (bool) ($this->unlimitedFlags[$key] ?? false);
    }

    public function valueFor(string $key): ?int
    {
        if ($this->isUnlimited($key)) {
            return null;
        }

        return match ($key) {
            'max_menu_items' => $this->maxMenuItems,
            'max_categories' => $this->maxCategories,
            'max_staff' => $this->maxStaff,
            'max_campaigns_per_month' => $this->maxCampaignsPerMonth,
            'max_push_notifications_per_month' => $this->maxPushNotificationsPerMonth,
            'max_storage_mb' => $this->maxStorageMb,
            'max_images' => $this->maxImages,
            'max_branches' => $this->maxBranches,
            'max_drivers' => $this->maxDrivers,
            'max_customers' => $this->maxCustomers,
            'max_products' => $this->maxProducts,
            'max_loyalty_members' => $this->maxLoyaltyMembers,
            'max_active_promotions' => $this->maxActivePromotions,
            'max_delivery_zones' => $this->maxDeliveryZones,
            'max_orders_per_day' => $this->maxOrdersPerDay,
            default => null,
        };
    }

    /**
     * @return array<string, int|null>
     */
    public function toArray(): array
    {
        $limits = [];
        foreach (self::LIMIT_KEYS as $key) {
            $limits[$key] = $this->valueFor($key);
        }

        return $limits;
    }

    /**
     * @return array<string, bool>
     */
    public function unlimitedToArray(): array
    {
        $flags = [];
        foreach (self::LIMIT_KEYS as $key) {
            $flags[$key] = $this->isUnlimited($key);
        }

        return $flags;
    }
}
