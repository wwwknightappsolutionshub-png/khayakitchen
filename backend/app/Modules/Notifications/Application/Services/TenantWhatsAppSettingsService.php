<?php

namespace App\Modules\Notifications\Application\Services;

use App\Modules\Notifications\Domain\Models\TenantWhatsAppSettings;
use App\Modules\Pricing\Application\Services\AuditLogService;
use App\Shared\Tenancy\TenantContext;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class TenantWhatsAppSettingsService
{
    public const PROVIDERS = ['meta', 'twilio', 'genius'];
    public const HOSTED_SESSION_TTL_DAYS = 30;
    public const HOSTED_STATUSES = ['inactive', 'pending_scan', 'active', 'expired', 'disconnected'];

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
                    'provider' => ['Provider must be meta, twilio, or genius.'],
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

    /**
     * Prepare a tenant-hosted WhatsApp session for QR pairing.
     * @return array<string, mixed>
     */
    public function initHostedSession(): array
    {
        $tenantId = $this->requireTenantId();
        $settings = $this->getOrCreate($tenantId);
        $this->expireHostedSessionIfNeeded($settings);

        $sessionId = $settings->hosted_session_id ?: $this->generateHostedSessionId();
        $qrPayload = json_encode([
            'type' => 'khayaos_whatsapp_hosted_session',
            'tenant_id' => $tenantId,
            'session_id' => $sessionId,
            'issued_at' => now()->toIso8601String(),
            'note' => 'Scan this session in your WhatsApp gateway app, then confirm activation below.',
        ]);

        $settings->update([
            'enabled' => true,
            'provider' => 'genius',
            'hosted_session_id' => $sessionId,
            'hosted_status' => 'pending_scan',
            'hosted_qr_payload' => $qrPayload,
            'hosted_last_seen_at' => now(),
        ]);

        $this->auditLogService->log(
            'tenant.whatsapp_session.initialized',
            $tenantId,
            $this->tenantContext->user()?->id,
            'tenant_whatsapp_settings',
            $settings->id,
            ['provider' => 'genius', 'hosted_status' => 'pending_scan'],
        );

        return $this->serialize($settings->fresh());
    }

    /**
     * Confirm a scanned hosted session and start the 30-day lifecycle.
     * @return array<string, mixed>
     */
    public function activateHostedSession(string $phoneNumber): array
    {
        $tenantId = $this->requireTenantId();
        $settings = $this->getOrCreate($tenantId);
        $this->expireHostedSessionIfNeeded($settings);

        if (! filled($settings->hosted_session_id)) {
            throw ValidationException::withMessages([
                'session' => ['Initialize a WhatsApp scan session first.'],
            ]);
        }

        $normalizedPhone = $this->normalizePhone($phoneNumber);
        if ($normalizedPhone === '') {
            throw ValidationException::withMessages([
                'phone_number' => ['Provide a valid WhatsApp phone number.'],
            ]);
        }

        $expiresAt = now()->addDays(self::HOSTED_SESSION_TTL_DAYS);
        $settings->update([
            'enabled' => true,
            'provider' => 'genius',
            'hosted_phone_number' => $normalizedPhone,
            'hosted_status' => 'active',
            'hosted_connected_at' => now(),
            'hosted_last_seen_at' => now(),
            'hosted_expires_at' => $expiresAt,
        ]);

        $this->auditLogService->log(
            'tenant.whatsapp_session.activated',
            $tenantId,
            $this->tenantContext->user()?->id,
            'tenant_whatsapp_settings',
            $settings->id,
            [
                'provider' => 'genius',
                'hosted_status' => 'active',
                'hosted_expires_at' => $expiresAt->toIso8601String(),
            ],
        );

        return $this->serialize($settings->fresh());
    }

    /**
     * Extend an active hosted session by 30 days.
     * @return array<string, mixed>
     */
    public function refreshHostedSession(): array
    {
        $tenantId = $this->requireTenantId();
        $settings = $this->getOrCreate($tenantId);
        $this->expireHostedSessionIfNeeded($settings);

        if ($settings->hosted_status !== 'active') {
            throw ValidationException::withMessages([
                'session' => ['Only an active WhatsApp session can be refreshed.'],
            ]);
        }

        $expiresAt = now()->addDays(self::HOSTED_SESSION_TTL_DAYS);
        $settings->update([
            'hosted_expires_at' => $expiresAt,
            'hosted_last_seen_at' => now(),
        ]);

        $this->auditLogService->log(
            'tenant.whatsapp_session.refreshed',
            $tenantId,
            $this->tenantContext->user()?->id,
            'tenant_whatsapp_settings',
            $settings->id,
            ['hosted_expires_at' => $expiresAt->toIso8601String()],
        );

        return $this->serialize($settings->fresh());
    }

    /**
     * Disconnect tenant hosted session and return to platform fallback.
     * @return array<string, mixed>
     */
    public function disconnectHostedSession(): array
    {
        $tenantId = $this->requireTenantId();
        $settings = $this->getOrCreate($tenantId);

        $settings->update([
            'hosted_phone_number' => null,
            'hosted_status' => 'disconnected',
            'hosted_qr_payload' => null,
            'hosted_connected_at' => null,
            'hosted_last_seen_at' => now(),
            'hosted_expires_at' => null,
        ]);

        $this->auditLogService->log(
            'tenant.whatsapp_session.disconnected',
            $tenantId,
            $this->tenantContext->user()?->id,
            'tenant_whatsapp_settings',
            $settings->id,
            ['provider' => $settings->provider],
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
            'hosted_status' => 'inactive',
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    private function serialize(TenantWhatsAppSettings $settings): array
    {
        $this->expireHostedSessionIfNeeded($settings);
        $settings = $settings->fresh() ?? $settings;
        $resolved = $this->credentialResolver->resolve($settings->tenant_id);

        $expiresAt = $settings->hosted_expires_at;
        $remainingDays = null;
        if ($expiresAt) {
            $remainingDays = max(0, now()->diffInDays($expiresAt, false));
        }

        return [
            'tenant_id' => $settings->tenant_id,
            'enabled' => (bool) $settings->enabled,
            'provider' => $settings->provider ?: 'meta',
            'phone_number_id' => $settings->phone_number_id,
            'has_access_token' => filled($settings->access_token),
            'twilio_account_sid' => $settings->twilio_account_sid,
            'has_twilio_auth_token' => filled($settings->twilio_auth_token),
            'twilio_from' => $settings->twilio_from,
            'hosted_session' => [
                'session_id' => $settings->hosted_session_id,
                'phone_number' => $settings->hosted_phone_number,
                'status' => $settings->hosted_status ?: 'inactive',
                'qr_payload' => $settings->hosted_qr_payload,
                'connected_at' => $settings->hosted_connected_at?->toIso8601String(),
                'last_seen_at' => $settings->hosted_last_seen_at?->toIso8601String(),
                'expires_at' => $settings->hosted_expires_at?->toIso8601String(),
                'remaining_days' => $remainingDays,
                'lifecycle_days' => self::HOSTED_SESSION_TTL_DAYS,
            ],
            'using_platform_fallback' => $resolved['source'] === 'platform',
            'active_source' => $resolved['source'],
            'active_provider' => $resolved['provider'],
            'platform_configured' => $this->credentialResolver->hasSendableCredentials(null),
        ];
    }

    private function expireHostedSessionIfNeeded(TenantWhatsAppSettings $settings): void
    {
        if ($settings->hosted_status !== 'active' || ! $settings->hosted_expires_at) {
            return;
        }

        if ($settings->hosted_expires_at->isFuture()) {
            return;
        }

        $settings->update([
            'hosted_status' => 'expired',
            'hosted_qr_payload' => null,
        ]);
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

    private function normalizePhone(string $phone): string
    {
        return preg_replace('/\s+/', '', trim($phone)) ?? '';
    }

    private function generateHostedSessionId(): string
    {
        return 'session_'.Str::lower(Str::random(18));
    }
}
