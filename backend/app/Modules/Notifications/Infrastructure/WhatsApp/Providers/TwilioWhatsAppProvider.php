<?php

namespace App\Modules\Notifications\Infrastructure\WhatsApp\Providers;

use App\Modules\Notifications\Infrastructure\WhatsApp\Contracts\WhatsAppProviderInterface;
use Illuminate\Support\Facades\Log;

class TwilioWhatsAppProvider implements WhatsAppProviderInterface
{
    public function send(string $toPhone, string $message, array $context = []): void
    {
        $sid = config('whatsapp.twilio.account_sid');
        $token = config('whatsapp.twilio.auth_token');
        $from = config('whatsapp.twilio.from');

        if (! $sid || ! $token || ! $from) {
            Log::info('WhatsApp (Twilio stub): provider not configured', [
                'to' => $toPhone,
                'message' => $message,
            ]);

            return;
        }

        throw new \RuntimeException('Twilio WhatsApp adapter is not implemented yet.');
    }
}
