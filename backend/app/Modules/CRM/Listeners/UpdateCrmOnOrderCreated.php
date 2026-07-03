<?php

namespace App\Modules\CRM\Listeners;

use App\Modules\CRM\Application\Services\CrmService;
use App\Modules\Orders\Events\OrderCreated;
use App\Shared\Tenancy\TenantContextRunner;

class UpdateCrmOnOrderCreated
{
    public function __construct(
        private CrmService $crmService,
        private TenantContextRunner $tenantContextRunner,
    ) {}

    public function handle(OrderCreated $event): void
    {
        $this->tenantContextRunner->runForOrder($event->order, function () use ($event) {
            $this->crmService->handleOrderCreated($event->order);
        });
    }
}
