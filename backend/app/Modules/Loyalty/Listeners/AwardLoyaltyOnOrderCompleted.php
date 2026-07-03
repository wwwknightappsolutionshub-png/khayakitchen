<?php

namespace App\Modules\Loyalty\Listeners;

use App\Modules\Loyalty\Application\Services\LoyaltyService;
use App\Modules\Orders\Events\OrderCompleted;
use App\Shared\Tenancy\TenantContextRunner;

class AwardLoyaltyOnOrderCompleted
{
    public function __construct(
        private LoyaltyService $loyaltyService,
        private TenantContextRunner $tenantContextRunner,
    ) {}

    public function handle(OrderCompleted $event): void
    {
        $this->tenantContextRunner->runForOrder($event->order, function () use ($event) {
            $this->loyaltyService->handleOrderCompleted($event->order);
        });
    }
}
