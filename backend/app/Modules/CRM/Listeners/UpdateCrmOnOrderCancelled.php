<?php

namespace App\Modules\CRM\Listeners;

use App\Modules\CRM\Application\Services\CrmService;
use App\Modules\Orders\Events\OrderCancelled;
use App\Shared\Tenancy\TenantContextRunner;

class UpdateCrmOnOrderCancelled
{
    public function __construct(
        private CrmService $crmService,
        private TenantContextRunner $tenantContextRunner,
    ) {}

    public function handle(OrderCancelled $event): void
    {
        $this->tenantContextRunner->runForOrder($event->order, function () use ($event) {
            $this->crmService->handleOrderCancelled($event->order);
        });
    }
}
