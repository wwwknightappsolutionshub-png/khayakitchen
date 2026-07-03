<?php

namespace App\Modules\Notifications\Infrastructure\WhatsApp;

use App\Modules\Notifications\Jobs\SendWhatsAppMessageJob;
use App\Modules\Orders\Domain\Models\Order;
use App\Shared\Entitlements\FeatureAccessService;

class WhatsAppService
{
    public const FEATURE_KEY = 'whatsapp_notifications';

    public function __construct(private FeatureAccessService $featureAccessService) {}

    public function isEnabledForTenant(string $tenantId): bool
    {
        return $this->featureAccessService->canAccess(self::FEATURE_KEY, $tenantId);
    }

    public function queueOrderMessage(Order $order, string $eventKey, string $message): void
    {
        if (! $order->customer_id) {
            return;
        }

        if (! $this->isEnabledForTenant($order->tenant_id)) {
            return;
        }

        SendWhatsAppMessageJob::dispatch(
            tenantId: $order->tenant_id,
            customerId: $order->customer_id,
            orderId: $order->id,
            eventKey: $eventKey,
            message: $message,
        );
    }
}
