<?php

namespace App\Modules\Realtime\Listeners;

use App\Modules\Orders\Events\OrderCancelled;
use App\Modules\Orders\Events\OrderCreated;
use App\Modules\Orders\Events\OrderStatusUpdated;
use App\Modules\Realtime\Infrastructure\WebSocketGateway;

class BroadcastRealtimeOrderUpdates
{
    public function __construct(private WebSocketGateway $gateway) {}

    public function handleOrderCreated(OrderCreated $event): void
    {
        $this->gateway->emitOrderCreated($event->order);
    }

    public function handleOrderStatusUpdated(OrderStatusUpdated $event): void
    {
        if ($event->order->status === 'cancelled') {
            return;
        }

        $this->gateway->emitOrderStatusChanged($event->order, $event->previousStatus);
    }

    public function handleOrderCancelled(OrderCancelled $event): void
    {
        $this->gateway->emitOrderCancelled($event->order);
    }
}
