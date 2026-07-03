<?php

namespace App\Modules\Notifications\Infrastructure\WhatsApp\Contracts;

interface WhatsAppProviderInterface
{
    /**
     * @param  array<string, mixed>  $context
     */
    public function send(string $toPhone, string $message, array $context = []): void;
}
