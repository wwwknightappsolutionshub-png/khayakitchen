<?php

namespace App\Modules\Notifications\Infrastructure\WhatsApp;

class WhatsAppMessageTemplates
{
    public const ORDER_CREATED = 'Your order has been received. We\'ll notify you when it\'s being prepared.';

    public const ORDER_ACCEPTED = 'Good news! Your order is now being prepared.';

    public const ORDER_PREPARING = 'Good news! Your order is now being prepared.';

    public const ORDER_READY = 'Your order is ready for pickup/delivery.';

    public const ORDER_COMPLETED = 'Thank you for ordering with us!';

    public static function forStatus(?string $status): ?string
    {
        return match ($status) {
            'pending' => self::ORDER_CREATED,
            'accepted' => self::ORDER_ACCEPTED,
            'preparing' => self::ORDER_PREPARING,
            'ready' => self::ORDER_READY,
            'completed' => self::ORDER_COMPLETED,
            default => null,
        };
    }

    public static function eventKey(?string $status): ?string
    {
        return match ($status) {
            'pending' => 'OrderCreated',
            'accepted' => 'OrderAccepted',
            'preparing' => 'OrderPreparing',
            'ready' => 'OrderReady',
            'completed' => 'OrderCompleted',
            default => null,
        };
    }
}
