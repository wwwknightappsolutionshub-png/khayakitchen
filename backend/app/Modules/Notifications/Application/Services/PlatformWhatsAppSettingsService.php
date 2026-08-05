<?php

namespace App\Modules\Notifications\Application\Services;

use App\Modules\Notifications\Domain\Models\PlatformWhatsAppSettings;
use App\Modules\Pricing\Application\Services\AuditLogService;
use App\Shared\Tenancy\TenantContext;
use Illuminate\Validation\ValidationException;

class PlatformWhatsAppSettingsService
{
    public const PROVIDERS = ['genius', 'meta', 'twilio'];

    public function __construct(
        private TenantContext $tenantContext,
        private AuditLogService $auditLogService,
        private WhatsAppCredentialResolver $credentialResolver,
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
