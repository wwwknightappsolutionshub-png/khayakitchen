<?php

namespace App\Modules\Auth\Application\Services;

use App\Modules\Auth\Domain\Models\Tenant;
use App\Modules\Pricing\Application\Services\AuditLogService;
use App\Modules\TenantBranding\Domain\Models\TenantBranding;
use App\Shared\Tenancy\TenantContext;
use Illuminate\Validation\ValidationException;

class TenantWorkspaceService
{
    public const THEMES = ['light', 'dark'];

    public function __construct(
        private TenantContext $tenantContext,
        private AuditLogService $auditLogService,
    ) {}

    /**
     * @return array<string, mixed>
     */
    public function getSettings(): array
    {
        $tenant = $this->requireTenant();

        return $this->serialize($tenant);
    }

    /**
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    public function updateSettings(array $data, array $permissions): array
    {
        if (! in_array($this->tenantContext->user()?->role, ['owner', 'super_admin'], true)) {
            abort(403, 'Only owners can update workspace settings');
        }

        $tenant = $this->requireTenant();
        $payload = [];

        if (array_key_exists('currency', $data)) {
            $currency = strtoupper(trim((string) $data['currency']));
            if ($currency === '' || strlen($currency) > 8) {
                throw ValidationException::withMessages([
                    'currency' => ['Enter a valid currency code.'],
                ]);
            }
            $payload['currency'] = $currency;
        }

        if (array_key_exists('country', $data)) {
            $payload['country'] = $data['country'] !== null && $data['country'] !== ''
                ? trim((string) $data['country'])
                : null;
        }

        if (array_key_exists('country_iso', $data)) {
            $iso = $data['country_iso'] !== null && $data['country_iso'] !== ''
                ? strtoupper(trim((string) $data['country_iso']))
                : null;
            if ($iso !== null && strlen($iso) !== 2) {
                throw ValidationException::withMessages([
                    'country_iso' => ['Country ISO code must be 2 letters.'],
                ]);
            }
            $payload['country_iso'] = $iso;
        }

        if (array_key_exists('timezone', $data)) {
            $payload['timezone'] = $data['timezone'] !== null && $data['timezone'] !== ''
                ? trim((string) $data['timezone'])
                : null;
        }

        if (array_key_exists('ui_theme', $data)) {
            $theme = strtolower(trim((string) $data['ui_theme']));
            if (! in_array($theme, self::THEMES, true)) {
                throw ValidationException::withMessages([
                    'ui_theme' => ['Theme must be light or dark.'],
                ]);
            }
            $payload['ui_theme'] = $theme;
        }

        if ($payload === []) {
            throw ValidationException::withMessages([
                'settings' => ['No workspace settings provided.'],
            ]);
        }

        $meta = $tenant->signup_metadata ?? [];
        if (! is_array($meta)) {
            $meta = [];
        }
        foreach (['currency', 'country', 'country_iso', 'timezone'] as $key) {
            if (array_key_exists($key, $payload)) {
                $meta[$key] = $payload[$key];
            }
        }
        $payload['signup_metadata'] = $meta;

        $tenant->update($payload);

        $this->auditLogService->log(
            'tenant.workspace_settings.updated',
            $tenant->id,
            $this->tenantContext->user()?->id,
            'tenant',
            $tenant->id,
            $payload,
        );

        return $this->serialize($tenant->fresh());
    }

    /**
     * @return array<string, mixed>
     */
    public function getPublicStorefrontConfig(?string $tenantId = null): array
    {
        $tenant = $tenantId
            ? Tenant::withoutGlobalScopes()->findOrFail($tenantId)
            : $this->requireTenant();

        return [
            'tenant_id' => $tenant->id,
            'slug' => $tenant->slug,
            'name' => $tenant->name,
            'currency' => strtoupper((string) ($tenant->currency ?: '')),
            'country' => $tenant->country,
            'country_iso' => $tenant->country_iso,
            'timezone' => $tenant->timezone,
            'ui_theme' => in_array($tenant->ui_theme, self::THEMES, true) ? $tenant->ui_theme : 'light',
            'ordering_path' => '/r/'.$tenant->slug,
        ];
    }

    private function requireTenant(): Tenant
    {
        $tenant = $this->tenantContext->tenant();
        if (! $tenant) {
            abort(400, 'Tenant could not be resolved');
        }

        return Tenant::withoutGlobalScopes()->findOrFail($tenant->id);
    }

    /**
     * @return array<string, mixed>
     */
    private function serialize(Tenant $tenant): array
    {
        $branding = TenantBranding::withoutGlobalScopes()
            ->where('tenant_id', $tenant->id)
            ->first();

        $logoUrl = $branding?->platform_override_logo_url
            ?: $branding?->logo_url
            ?: $tenant->logo_url;

        $displayName = filled($branding?->restaurant_name)
            ? $branding->restaurant_name
            : $tenant->name;

        return [
            'tenant_id' => $tenant->id,
            'name' => $displayName,
            'slug' => $tenant->slug,
            'logo_url' => $logoUrl,
            'currency' => strtoupper((string) ($tenant->currency ?: '')),
            'country' => $tenant->country,
            'country_iso' => $tenant->country_iso,
            'timezone' => $tenant->timezone,
            'ui_theme' => in_array($tenant->ui_theme, self::THEMES, true) ? $tenant->ui_theme : 'light',
            'ordering_path' => '/r/'.$tenant->slug,
            'ordering_url_hint' => '/r/'.$tenant->slug,
        ];
    }
}
