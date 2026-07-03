<?php

namespace App\Modules\Inventory\Listeners;

use App\Modules\Inventory\Application\Services\InventoryService;
use App\Modules\Orders\Events\OrderCompleted;
use App\Shared\Tenancy\TenantContextRunner;

class ConsumeInventoryOnOrderCompleted
{
    public function __construct(
        private InventoryService $inventoryService,
        private TenantContextRunner $tenantContextRunner,
    ) {}

    public function handle(OrderCompleted $event): void
    {
        $this->tenantContextRunner->runForOrder($event->order, function () use ($event) {
            $this->inventoryService->consumeForOrder($event->order);
        });
    }
}
