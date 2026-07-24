<?php

namespace App\Modules\Notifications\Infrastructure\WhatsApp\Providers;

use App\Modules\Notifications\Infrastructure\WhatsApp\Contracts\WhatsAppProviderInterface;
use Illuminate\Support\Facades\Log;

class TwilioWhatsAppProvider implements WhatsAppProviderInterface
{
    public function send(string $toPhone, string $message, array $context = []): void
    {
        $this->sendWithCredentials($toPhone, $message, [
            'account_sid' => config('whatsapp.twilio.account_sid'),
            'auth_token' => config('whatsapp.twilio.auth_token'),
            'from' => config('whatsapp.twilio.from'),
        ], $context);
    }

    /**
     * @param  array{account_sid?: ?string, auth_token?: ?string, from?: ?string}  $credentials
     * @param  array<string, mixed>  $context
     */
    public function sendWithCredentials(string $toPhone, string $message, array $credentials, array $context = []): void
    {
        $sid = $credentials['account_sid'] ?? null;
        $token = $credentials['auth_token'] ?? null;
        $from = $credentials['from'] ?? null;

        if (! $sid || ! $token || ! $from) {
            Log::info('WhatsApp (Twilio stub): provider not configured', [
                'to' => $toPhone,
                'message' => $message,
                'context' => $context,
            ]);

            return;
        }

        throw new \RuntimeException('Twilio WhatsApp adapter is not implemented yet.');
    }
}
