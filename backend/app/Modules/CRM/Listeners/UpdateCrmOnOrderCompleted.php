<?php

namespace App\Modules\CRM\Listeners;

use App\Modules\CRM\Application\Services\CrmService;
use App\Modules\Orders\Events\OrderCompleted;
use App\Shared\Tenancy\TenantContextRunner;

class UpdateCrmOnOrderCompleted
{
    public function __construct(
        private CrmService $crmService,
        private TenantContextRunner $tenantContextRunner,
    ) {}

    public function handle(OrderCompleted $event): void
    {
        $this->tenantContextRunner->runForOrder($event->order, function () use ($event) {
            $this->crmService->handleOrderCompleted($event->order);
        });
    }
}
