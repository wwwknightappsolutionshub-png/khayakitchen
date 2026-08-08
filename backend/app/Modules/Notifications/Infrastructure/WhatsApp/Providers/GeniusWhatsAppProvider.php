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
        $result = $this->attemptSendWithCredentials($toPhone, $message, $credentials, $context);
        if (! ($result['ok'] ?? false)) {
            throw new \RuntimeException(
                (string) ($result['error'] ?? 'Genius WhatsApp send failed.'),
            );
        }
    }

    /**
     * Same as sendWithCredentials but returns success/failure for Super Admin diagnostics.
     *
     * @param  array{api_key?: ?string, session_id?: ?string, base_url?: ?string}  $credentials
     * @param  array<string, mixed>  $context
     * @return array{ok: bool, error?: string, status?: int}
     */
    public function attemptSendWithCredentials(string $toPhone, string $message, array $credentials, array $context = []): array
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

            return [
                'ok' => false,
                'error' => 'Genius API key or session ID is missing.',
            ];
        }

        $number = preg_replace('/\D+/', '', $toPhone) ?: $toPhone;
        $mediaUrl = isset($context['media_url']) ? trim((string) $context['media_url']) : '';
        $mediaBase64 = isset($context['media_base64']) ? trim((string) $context['media_base64']) : '';
        $isImage = $mediaUrl !== '' || $mediaBase64 !== '';

        $payload = [
            'sessionId' => $sessionId,
            'number' => $number,
            'type' => $isImage ? 'image' : 'text',
            'message' => $message,
            'source' => 'API',
        ];

        if ($isImage) {
            // Genius /api/send image — public HTTPS JPEG URL (Laravel /api media route).
            // Also set mediaUrl for gateways that ignore `url`.
            $resolvedUrl = $mediaUrl !== ''
                ? $mediaUrl
                : 'data:image/jpeg;base64,'.$mediaBase64;
            $payload['url'] = $resolvedUrl;
            $payload['mediaUrl'] = $resolvedUrl;
        }

        try {
            // Queue workers may send during Genius backlog; allow a bit longer than the
            // Super Admin interactive test path without blocking signup HTTP (which is queued).
            $response = Http::timeout(20)->connectTimeout(5)->withHeaders([
                'x-api-key' => $apiKey,
                'Accept' => 'application/json',
                'Content-Type' => 'application/json',
            ])->post("{$baseUrl}/api/send", $payload);
        } catch (\Throwable $e) {
            $errorMessage = $e->getMessage();
            Log::error('WhatsApp (Genius): request failed', [
                'to' => $number,
                'error' => $errorMessage,
                'context' => $context,
            ]);

            return [
                'ok' => false,
                'error' => 'Genius did not confirm delivery: '.$errorMessage,
            ];
        }

        if ($response->failed()) {
            Log::error('WhatsApp (Genius): API send failed', [
                'to' => $number,
                'status' => $response->status(),
                'body' => $response->body(),
                'context' => $context,
            ]);

            $body = trim($response->body());

            return [
                'ok' => false,
                'status' => $response->status(),
                'error' => $body !== ''
                    ? 'Genius API error (HTTP '.$response->status().'): '.$body
                    : 'Genius API error (HTTP '.$response->status().').',
            ];
        }

        Log::info('WhatsApp (Genius): message sent', [
            'to' => $number,
            'context_type' => $context['type'] ?? null,
        ]);

        return ['ok' => true];
    }
}
