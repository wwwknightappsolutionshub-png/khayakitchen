<?php

namespace App\Providers;

use App\Modules\CRM\Listeners\UpdateCrmOnOrderCancelled;
use App\Modules\CRM\Listeners\UpdateCrmOnOrderCompleted;
use App\Modules\CRM\Listeners\UpdateCrmOnOrderCreated;
use App\Modules\Inventory\Listeners\ConsumeInventoryOnOrderCompleted;
use App\Modules\Loyalty\Listeners\AwardLoyaltyOnOrderCompleted;
use App\Modules\Notifications\Listeners\SendOrderNotifications;
use App\Modules\Notifications\Listeners\SendWhatsAppOrderNotifications;
use App\Modules\Orders\Events\OrderCancelled;
use App\Modules\Orders\Events\OrderCompleted;
use App\Modules\Orders\Events\OrderCreated;
use App\Modules\Orders\Events\OrderStatusUpdated;
use App\Modules\Realtime\Listeners\BroadcastRealtimeOrderUpdates;
use App\Modules\TenantBranding\Events\PromoModeActivated;
use App\Modules\TenantBranding\Listeners\TriggerPromoModeAlert;
use Illuminate\Foundation\Support\Providers\EventServiceProvider as ServiceProvider;

class EventServiceProvider extends ServiceProvider
{
    protected $listen = [
        OrderCreated::class => [
            UpdateCrmOnOrderCreated::class,
            [SendOrderNotifications::class, 'handleOrderCreated'],
            [SendWhatsAppOrderNotifications::class, 'handleOrderCreated'],
            [BroadcastRealtimeOrderUpdates::class, 'handleOrderCreated'],
        ],
        OrderStatusUpdated::class => [
            [SendOrderNotifications::class, 'handleOrderStatusUpdated'],
            [SendWhatsAppOrderNotifications::class, 'handleOrderStatusUpdated'],
            [BroadcastRealtimeOrderUpdates::class, 'handleOrderStatusUpdated'],
        ],
        OrderCompleted::class => [
            ConsumeInventoryOnOrderCompleted::class,
            AwardLoyaltyOnOrderCompleted::class,
            UpdateCrmOnOrderCompleted::class,
        ],
        OrderCancelled::class => [
            UpdateCrmOnOrderCancelled::class,
            [BroadcastRealtimeOrderUpdates::class, 'handleOrderCancelled'],
        ],
        PromoModeActivated::class => [
            TriggerPromoModeAlert::class,
        ],
    ];
}
