<?php

namespace App\Modules\Notifications\Infrastructure\WhatsApp\Providers;

use App\Modules\Notifications\Infrastructure\WhatsApp\Contracts\WhatsAppProviderInterface;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class GeniusWhatsAppProvider implements WhatsAppProviderInterface
{
    public function send(string $toPhone, string $message, array $context = []): void
    {
        $this->sendWithCredentials($toPhone, $message, [
            'api_key' => config('whatsapp.genius.api_key'),
            'session_id' => config('whatsapp.genius.session_id'),
            'base_url' => config('whatsapp.genius.base_url'),
        ], $context);
    }

    /**
     * @param  array{api_key?: ?string, session_id?: ?string, base_url?: ?string}  $credentials
     * @param  array<string, mixed>  $context
     */
    public function sendWithCredentials(string $toPhone, string $message, array $credentials, array $context = []): void
    {
        $apiKey = $credentials['api_key'] ?? null;
        $sessionId = $credentials['session_id'] ?? null;
        $baseUrl = rtrim((string) ($credentials['base_url'] ?? config('whatsapp.genius.base_url')), '/');

        if (! $apiKey || ! $sessionId) {
            Log::info('WhatsApp (Genius stub): message not sent — credentials not configured', [
                'to' => $toPhone,
                'message' => $message,
                'context' => $context,
            ]);

            return;
        }

        $number = preg_replace('/\D+/', '', $toPhone) ?: $toPhone;

        $response = Http::timeout(8)->withHeaders([
            'x-api-key' => $apiKey,
            'Accept' => 'application/json',
            'Content-Type' => 'application/json',
        ])->post("{$baseUrl}/api/send", [
            'sessionId' => $sessionId,
            'number' => $number,
            'type' => 'text',
            'message' => $message,
            'source' => 'API',
        ]);

        if ($response->failed()) {
            throw new \RuntimeException(
                'Genius WhatsApp API error: '.$response->body(),
            );
        }
    }
}
