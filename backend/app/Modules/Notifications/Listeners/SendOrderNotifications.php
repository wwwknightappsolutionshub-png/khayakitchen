<?php

namespace App\Modules\Notifications\Listeners;

use App\Modules\Notifications\Application\Services\NotificationService;
use App\Modules\Orders\Events\OrderCreated;
use App\Modules\Orders\Events\OrderStatusUpdated;

class SendOrderNotifications
{
    public function __construct(private NotificationService $notificationService) {}

    public function handleOrderCreated(OrderCreated $event): void
    {
        $order = $event->order;
        $this->notificationService->notifyOrderEvent(
            $order,
            'order.created',
            "New order #{$order->id} received ({$order->status})",
        );
    }

    public function handleOrderStatusUpdated(OrderStatusUpdated $event): void
    {
        $order = $event->order;
        $this->notificationService->notifyOrderEvent(
            $order,
            'order.status_updated',
            "Order #{$order->id} status changed to {$order->status}",
        );
    }
}
