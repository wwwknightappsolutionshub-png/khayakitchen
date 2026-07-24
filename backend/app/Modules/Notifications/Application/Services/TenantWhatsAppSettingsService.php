<?php

namespace App\Modules\Notifications\Application\Services;

use App\Modules\Notifications\Domain\Models\TenantWhatsAppSettings;
use App\Modules\Pricing\Application\Services\AuditLogService;
use App\Shared\Tenancy\TenantContext;
use Illuminate\Validation\ValidationException;

class TenantWhatsAppSettingsService
{
    public const PROVIDERS = ['meta', 'twilio'];

    public function __construct(
        private TenantContext $tenantContext,
        private AuditLogService $auditLogService,
        private WhatsAppCredentialResolver $credentialResolver,
    ) {}

    /**
     * @return array<string, mixed>
     */
    public function getForCurrentTenant(): array
    {
        $tenantId = $this->requireTenantId();
        $settings = $this->getOrCreate($tenantId);

        return $this->serialize($settings);
    }

    /**
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    public function updateForCurrentTenant(array $data): array
    {
        if (! in_array($this->tenantContext->user()?->role, ['owner', 'super_admin', 'manager'], true)) {
            abort(403, 'Only owners and managers can update WhatsApp settings');
        }

        $tenantId = $this->requireTenantId();
        $settings = $this->getOrCreate($tenantId);
        $payload = [];

        if (array_key_exists('enabled', $data)) {
            $payload['enabled'] = (bool) $data['enabled'];
        }

        if (array_key_exists('provider', $data)) {
            $provider = strtolower(trim((string) $data['provider']));
            if (! in_array($provider, self::PROVIDERS, true)) {
                throw ValidationException::withMessages([
                    'provider' => ['Provider must be meta or twilio.'],
                ]);
            }
            $payload['provider'] = $provider;
        }

        if (array_key_exists('phone_number_id', $data)) {
            $payload['phone_number_id'] = $this->nullableString($data['phone_number_id']);
        }

        if (array_key_exists('access_token', $data) && filled($data['access_token'])) {
            $payload['access_token'] = (string) $data['access_token'];
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
        unset($auditPayload['access_token'], $auditPayload['twilio_auth_token']);
        if (isset($payload['access_token'])) {
            $auditPayload['access_token_updated'] = true;
        }
        if (isset($payload['twilio_auth_token'])) {
            $auditPayload['twilio_auth_token_updated'] = true;
        }

        $this->auditLogService->log(
            'tenant.whatsapp_settings.updated',
            $tenantId,
            $this->tenantContext->user()?->id,
            'tenant_whatsapp_settings',
            $settings->id,
            $auditPayload,
        );

        return $this->serialize($settings->fresh());
    }

    public function getOrCreate(string $tenantId): TenantWhatsAppSettings
    {
        $settings = TenantWhatsAppSettings::withoutGlobalScopes()
            ->where('tenant_id', $tenantId)
            ->first();

        if ($settings) {
            return $settings;
        }

        return TenantWhatsAppSettings::create([
            'tenant_id' => $tenantId,
            'enabled' => false,
            'provider' => 'meta',
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    private function serialize(TenantWhatsAppSettings $settings): array
    {
        $resolved = $this->credentialResolver->resolve($settings->tenant_id);

        return [
            'tenant_id' => $settings->tenant_id,
            'enabled' => (bool) $settings->enabled,
            'provider' => $settings->provider ?: 'meta',
            'phone_number_id' => $settings->phone_number_id,
            'has_access_token' => filled($settings->access_token),
            'twilio_account_sid' => $settings->twilio_account_sid,
            'has_twilio_auth_token' => filled($settings->twilio_auth_token),
            'twilio_from' => $settings->twilio_from,
            'using_platform_fallback' => $resolved['source'] === 'platform',
            'active_source' => $resolved['source'],
            'active_provider' => $resolved['provider'],
            'platform_configured' => $this->credentialResolver->hasSendableCredentials(null),
        ];
    }

    private function requireTenantId(): string
    {
        $tenantId = $this->tenantContext->id();
        if (! $tenantId) {
            abort(400, 'Tenant could not be resolved');
        }

        return $tenantId;
    }

    private function nullableString(mixed $value): ?string
    {
        if ($value === null || $value === '') {
            return null;
        }

        return trim((string) $value);
    }
}
