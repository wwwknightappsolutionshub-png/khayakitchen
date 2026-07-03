<?php

namespace App\Modules\Notifications\Listeners;

use App\Modules\Notifications\Infrastructure\WhatsApp\WhatsAppMessageTemplates;
use App\Modules\Notifications\Infrastructure\WhatsApp\WhatsAppService;
use App\Modules\Orders\Events\OrderCreated;
use App\Modules\Orders\Events\OrderStatusUpdated;

class SendWhatsAppOrderNotifications
{
    public function __construct(private WhatsAppService $whatsAppService) {}

    public function handleOrderCreated(OrderCreated $event): void
    {
        $order = $event->order;
        $this->dispatchForStatus($order, 'pending');
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
        $message = WhatsAppMessageTemplates::forStatus($status);
        $eventKey = WhatsAppMessageTemplates::eventKey($status);

        if (! $message || ! $eventKey) {
            return;
        }

        $this->whatsAppService->queueOrderMessage($order, $eventKey, $message);
    }
}
