<?php

namespace App\Modules\Notifications\Listeners;

use App\Modules\Notifications\Infrastructure\WhatsApp\WhatsAppMessageTemplates;
use App\Modules\Notifications\Jobs\SendOrderEmailNotificationJob;
use App\Modules\Orders\Events\OrderCreated;
use App\Modules\Orders\Events\OrderStatusUpdated;

class SendEmailOrderNotifications
{
    public function handleOrderCreated(OrderCreated $event): void
    {
        $this->dispatchForStatus($event->order, 'pending');
    }

    public function handleOrderStatusUpdated(OrderStatusUpdated $event): void
    {
        $status = $event->order->status;

        if (in_array($status, ['accepted', 'preparing', 'ready', 'completed'], true)) {
            $this->dispatchForStatus($event->order, $status);
        }
    }

    private function dispatchForStatus($order, string $status): void
    {
        if (! $order->customer_id) {
            return;
        }

        $message = WhatsAppMessageTemplates::forStatus($status);
        $eventKey = WhatsAppMessageTemplates::eventKey($status);

        if (! $message || ! $eventKey) {
            return;
        }

        $subject = match ($status) {
            'pending' => 'Order received',
            'accepted' => 'Order accepted',
            'preparing' => 'Order being prepared',
            'ready' => 'Order ready',
            'completed' => 'Order completed',
            default => 'Order update',
        };

        SendOrderEmailNotificationJob::dispatch(
            tenantId: $order->tenant_id,
            customerId: $order->customer_id,
            orderId: $order->id,
            eventKey: $eventKey,
            subject: $subject,
            body: $message,
        );
    }
}
