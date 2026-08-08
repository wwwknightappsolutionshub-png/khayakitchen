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
            Log::error('WhatsApp (Genius): message not sent — api_key/session_id missing', [
                'to' => $toPhone,
                'has_api_key' => filled($apiKey),
                'has_session_id' => filled($sessionId),
                'base_url' => $baseUrl,
                'context' => $context,
            ]);

            return;
        }

        $number = preg_replace('/\D+/', '', $toPhone) ?: $toPhone;

        try {
            $response = Http::timeout(8)->connectTimeout(3)->withHeaders([
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
        } catch (\Throwable $e) {
            Log::error('WhatsApp (Genius): request failed', [
                'to' => $number,
                'error' => $e->getMessage(),
                'context' => $context,
            ]);

            // Never throw — callers (signup queue job, orders) must soft-fail.
            return;
        }

        if ($response->failed()) {
            Log::error('WhatsApp (Genius): API send failed', [
                'to' => $number,
                'status' => $response->status(),
                'body' => $response->body(),
                'context' => $context,
            ]);

            // Never throw — signup/order paths must not become Server Error when Genius rejects.
            return;
        }

        Log::info('WhatsApp (Genius): message sent', [
            'to' => $number,
            'context_type' => $context['type'] ?? null,
        ]);
    }
}
