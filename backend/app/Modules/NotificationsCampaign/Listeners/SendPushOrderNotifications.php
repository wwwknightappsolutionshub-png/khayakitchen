<?php

namespace App\Modules\NotificationsCampaign\Listeners;

use App\Modules\NotificationsCampaign\Application\Services\CustomerNotificationPreferenceService;
use App\Modules\NotificationsCampaign\Jobs\SendPushNotificationJob;
use App\Modules\Orders\Events\OrderCreated;
use App\Modules\Orders\Events\OrderStatusUpdated;
use App\Shared\Tenancy\TenantContextRunner;

class SendPushOrderNotifications
{
    public function __construct(
        private TenantContextRunner $tenantContextRunner,
        private CustomerNotificationPreferenceService $preferenceService,
    ) {}

    public function handleOrderCreated(OrderCreated $event): void
    {
        $order = $event->order;

        if (! $order->customer_id) {
            return;
        }

        $this->dispatchPush(
            $order->tenant_id,
            $order->customer_id,
            'Order received',
            'We received your order and will update you shortly.',
            ['order_id' => $order->id, 'status' => 'pending'],
        );
    }

    public function handle(OrderStatusUpdated $event): void
    {
        $order = $event->order;

        if (! $order->customer_id) {
            return;
        }

        $title = 'Order update';
        $body = match ($order->status) {
            'accepted' => 'Your order has been accepted!',
            'preparing' => 'Your order is being prepared.',
            'ready' => 'Your order is ready for pickup!',
            'completed' => 'Order completed. Thank you!',
            'cancelled' => 'Your order was cancelled.',
            default => null,
        };

        if (! $body) {
            return;
        }

        $this->dispatchPush(
            $order->tenant_id,
            $order->customer_id,
            $title,
            $body,
            ['order_id' => $order->id, 'status' => $order->status],
        );
    }

    /**
     * @param  array<string, mixed>  $context
     */
    private function dispatchPush(
        string $tenantId,
        string $customerId,
        string $title,
        string $body,
        array $context,
    ): void {
        $this->tenantContextRunner->runForTenant($tenantId, function () use ($tenantId, $customerId, $title, $body, $context) {
            if (! $this->preferenceService->isPushOptedIn($tenantId, $customerId)) {
                return;
            }

            SendPushNotificationJob::dispatch($tenantId, $customerId, $title, $body, $context);
        });
    }
}
