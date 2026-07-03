<?php

namespace App\Modules\Pricing\Domain\ValueObjects;

class PlanLimits
{
    public function __construct(
        public int $maxMenuItems,
        public int $maxOrdersPerDay,
        public int $maxCustomers,
    ) {}

    /**
     * @return array<string, int>
     */
    public function toArray(): array
    {
        return [
            'max_menu_items' => $this->maxMenuItems,
            'max_orders_per_day' => $this->maxOrdersPerDay,
            'max_customers' => $this->maxCustomers,
        ];
    }
}
