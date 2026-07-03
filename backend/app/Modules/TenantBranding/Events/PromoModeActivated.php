<?php

namespace App\Modules\TenantBranding\Events;

use App\Modules\TenantBranding\Domain\Models\RestaurantStatus;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class PromoModeActivated
{
    use Dispatchable, SerializesModels;

    public function __construct(public RestaurantStatus $status) {}
}
