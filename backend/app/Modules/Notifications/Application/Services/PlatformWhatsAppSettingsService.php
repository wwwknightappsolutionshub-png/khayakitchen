<?php

namespace App\Modules\Notifications\Application\Services;

use App\Modules\Notifications\Domain\Models\PlatformWhatsAppSettings;
use App\Modules\Notifications\Infrastructure\WhatsApp\Contracts\WhatsAppProviderInterface;
use App\Modules\Notifications\Infrastructure\WhatsApp\Providers\GeniusWhatsAppProvider;
use App\Modules\Pricing\Application\Services\AuditLogService;
use App\Shared\Tenancy\TenantContext;
use Illuminate\Validation\ValidationException;
use Throwable;

class PlatformWhatsAppSettingsService
{
    public const PROVIDERS = ['genius', 'meta', 'twilio'];

    public const DEFAULT_TEST_MESSAGE = 'KhayaOS platform WhatsApp test — if you received this, delivery works.';

    public function __construct(
        private TenantContext $tenantContext,
        private AuditLogService $auditLogService,
        private WhatsAppCredentialResolver $credentialResolver,
        private WhatsAppProviderInterface $whatsAppProvider,
        private GeniusWhatsAppProvider $geniusProvider,
    ) {}

    /**
     * @return array<string, mixed>
     */
    public function get(): array
    {
        return $this->serialize($this->getOrCreate());
    }

    /**
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    public function update(array $data): array
    {
        $settings = $this->getOrCreate();
        $payload = [];

        if (array_key_exists('enabled', $data)) {
            $payload['enabled'] = (bool) $data['enabled'];
        }

        if (array_key_exists('provider', $data)) {
            $provider = strtolower(trim((string) $data['provider']));
            if (! in_array($provider, self::PROVIDERS, true)) {
                throw ValidationException::withMessages([
                    'provider' => ['Provider must be genius, meta, or twilio.'],
                ]);
            }
            $payload['provider'] = $provider;
        }

        if (array_key_exists('api_key', $data) && filled($data['api_key'])) {
            $payload['api_key'] = (string) $data['api_key'];
        }

        if (array_key_exists('session_id', $data)) {
            $payload['session_id'] = $this->nullableString($data['session_id']);
        }

        if (array_key_exists('base_url', $data)) {
            $payload['base_url'] = $this->nullableString($data['base_url']);
        }

        if (array_key_exists('meta_phone_number_id', $data)) {
            $payload['meta_phone_number_id'] = $this->nullableString($data['meta_phone_number_id']);
        }

        if (array_key_exists('meta_access_token', $data) && filled($data['meta_access_token'])) {
            $payload['meta_access_token'] = (string) $data['meta_access_token'];
        }

        if (array_key_exists('twilio_account_sid', $data)) {
            $payload['twilio_account_sid'] = $this->nullableString($data['twilio_account_sid']);
        }

        if (array_key_exists('twilio_auth_token', $data) && filled($data['twilio_auth_token'])) {
            $payload['twilio_auth_token'] = (string) $data['twilio_auth_token'];
        }

        if (array_key_exists('twilio_from', $data)) {
            $payload['twilio_from'] = $this->nullableString($data['twilio_from']);
        }

        if ($payload === []) {
            throw ValidationException::withMessages([
                'settings' => ['No WhatsApp settings provided.'],
            ]);
        }

        $settings->update($payload);

        $auditPayload = $payload;
        unset($auditPayload['api_key'], $auditPayload['meta_access_token'], $auditPayload['twilio_auth_token']);
        if (isset($payload['api_key'])) {
            $auditPayload['api_key_updated'] = true;
        }
        if (isset($payload['meta_access_token'])) {
            $auditPayload['meta_access_token_updated'] = true;
        }
        if (isset($payload['twilio_auth_token'])) {
            $auditPayload['twilio_auth_token_updated'] = true;
        }

        $this->auditLogService->log(
            'platform.whatsapp_settings.updated',
            null,
            $this->tenantContext->user()?->id,
            'platform_whatsapp_settings',
            $settings->id,
            $auditPayload,
        );

        return $this->serialize($settings->fresh());
    }

    public function getOrCreate(): PlatformWhatsAppSettings
    {
        $settings = PlatformWhatsAppSettings::query()->first();

        if ($settings) {
            return $settings;
        }

        return PlatformWhatsAppSettings::create([
            'enabled' => false,
            'provider' => 'genius',
            'base_url' => config('whatsapp.genius.base_url'),
        ]);
    }

    /**
     * Super Admin diagnostic: send one platform WhatsApp using saved credentials.
     *
     * @return array{sent: bool, phone: string, provider: string, source: string, message: string, error?: string}
     */
    public function sendTestMessage(string $phone, ?string $message = null): array
    {
        $normalizedPhone = preg_replace('/\s+/', '', trim($phone)) ?? '';
        if ($normalizedPhone === '' || ! str_starts_with($normalizedPhone, '+')) {
            throw ValidationException::withMessages([
                'phone' => ['Phone must be E.164, e.g. +447756183484.'],
            ]);
        }

        if (! $this->credentialResolver->hasSendableCredentials(null)) {
            throw ValidationException::withMessages([
                'phone' => ['Platform WhatsApp credentials are incomplete. Enable the sender and save API key + session ID (or Meta/Twilio credentials) first.'],
            ]);
        }

        $body = filled($message) ? trim((string) $message) : self::DEFAULT_TEST_MESSAGE;
        $resolved = $this->credentialResolver->resolve(null);
        $context = [
            'type' => 'platform_test',
            'tenant_id' => null,
        ];

        $sendResult = ['ok' => false, 'error' => 'Send did not complete.'];

        if ($resolved['provider'] === 'genius') {
            $sendResult = $this->geniusProvider->attemptSendWithCredentials(
                $normalizedPhone,
                $body,
                $resolved['genius'],
                $context,
            );
        } else {
            try {
                $this->whatsAppProvider->send($normalizedPhone, $body, $context);
                $sendResult = ['ok' => true];
            } catch (Throwable $e) {
                $sendResult = [
                    'ok' => false,
                    'error' => $e->getMessage(),
                ];
            }
        }

        $this->auditLogService->log(
            'platform.whatsapp_settings.test_sent',
            null,
            $this->tenantContext->user()?->id,
            'platform_whatsapp_settings',
            $this->getOrCreate()->id,
            [
                'phone' => $normalizedPhone,
                'provider' => $resolved['provider'],
                'source' => $resolved['source'],
                'sent' => (bool) ($sendResult['ok'] ?? false),
                'error' => $sendResult['error'] ?? null,
            ],
        );

        if (! ($sendResult['ok'] ?? false)) {
            return [
                'sent' => false,
                'phone' => $normalizedPhone,
                'provider' => $resolved['provider'],
                'source' => $resolved['source'],
                'message' => $body,
                'error' => (string) ($sendResult['error'] ?? 'WhatsApp provider rejected the test message.'),
            ];
        }

        return [
            'sent' => true,
            'phone' => $normalizedPhone,
            'provider' => $resolved['provider'],
            'source' => $resolved['source'],
            'message' => $body,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function serialize(PlatformWhatsAppSettings $settings): array
    {
        $resolved = $this->credentialResolver->resolve(null);

        return [
            'enabled' => (bool) $settings->enabled,
            'provider' => $settings->provider ?: 'genius',
            'has_api_key' => filled($settings->api_key),
            'session_id' => $settings->session_id,
            'base_url' => $settings->base_url ?: config('whatsapp.genius.base_url'),
            'meta_phone_number_id' => $settings->meta_phone_number_id,
            'has_meta_access_token' => filled($settings->meta_access_token),
            'twilio_account_sid' => $settings->twilio_account_sid,
            'has_twilio_auth_token' => filled($settings->twilio_auth_token),
            'twilio_from' => $settings->twilio_from,
            'configured' => $this->credentialResolver->hasSendableCredentials(null),
            'active_provider' => $resolved['provider'],
            'active_source' => $resolved['source'],
        ];
    }

    private function nullableString(mixed $value): ?string
    {
        if ($value === null || $value === '') {
            return null;
        }

        return trim((string) $value);
    }
}
