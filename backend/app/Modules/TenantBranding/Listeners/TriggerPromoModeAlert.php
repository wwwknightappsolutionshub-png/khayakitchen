<?php

namespace App\Modules\TenantBranding\Listeners;

use App\Modules\TenantBranding\Application\Services\PromoAlertService;
use App\Modules\TenantBranding\Events\PromoModeActivated;

class TriggerPromoModeAlert
{
    public function __construct(private PromoAlertService $promoAlertService) {}

    public function handle(PromoModeActivated $event): void
    {
        $this->promoAlertService->handlePromoModeActivated($event->status);
    }
}
