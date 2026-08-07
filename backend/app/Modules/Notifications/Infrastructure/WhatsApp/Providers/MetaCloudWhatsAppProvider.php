<?php

namespace App\Modules\Notifications\Infrastructure\WhatsApp\Providers;

use App\Modules\Notifications\Infrastructure\WhatsApp\Contracts\WhatsAppProviderInterface;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class MetaCloudWhatsAppProvider implements WhatsAppProviderInterface
{
    public function send(string $toPhone, string $message, array $context = []): void
    {
        $this->sendWithCredentials($toPhone, $message, [
            'access_token' => config('whatsapp.meta.access_token'),
            'phone_number_id' => config('whatsapp.meta.phone_number_id'),
        ], $context);
    }

    /**
     * @param  array{access_token?: ?string, phone_number_id?: ?string}  $credentials
     * @param  array<string, mixed>  $context
     */
    public function sendWithCredentials(string $toPhone, string $message, array $credentials, array $context = []): void
    {
        $token = $credentials['access_token'] ?? null;
        $phoneNumberId = $credentials['phone_number_id'] ?? null;

        if (! $token || ! $phoneNumberId) {
            Log::info('WhatsApp (Meta stub): message not sent — credentials not configured', [
                'to' => $toPhone,
                'message' => $message,
                'context' => $context,
            ]);

            return;
        }

        $response = Http::timeout(8)->withToken($token)
            ->post("https://graph.facebook.com/v19.0/{$phoneNumberId}/messages", [
                'messaging_product' => 'whatsapp',
                'to' => $toPhone,
                'type' => 'text',
                'text' => ['body' => $message],
            ]);

        if ($response->failed()) {
            throw new \RuntimeException(
                'Meta WhatsApp API error: '.$response->body(),
            );
        }
    }
}
