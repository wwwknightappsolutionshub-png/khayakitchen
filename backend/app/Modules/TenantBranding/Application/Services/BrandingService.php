<?php

namespace App\Modules\TenantBranding\Application\Services;

use App\Modules\Pricing\Application\Services\AuditLogService;
use App\Modules\TenantBranding\Domain\Models\TenantBranding;
use App\Shared\Auth\PermissionService;
use App\Shared\Tenancy\TenantContext;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

class BrandingService
{
    public function __construct(
        private TenantContext $tenantContext,
        private PermissionService $permissionService,
        private AuditLogService $auditLogService,
    ) {}

    public function getForTenant(?string $tenantId = null): TenantBranding
    {
        $tenantId = $tenantId ?? $this->tenantContext->id();

        return TenantBranding::withoutGlobalScopes()->firstOrCreate(
            ['tenant_id' => $tenantId],
            [
                'restaurant_name' => 'Khaya Kitchen',
                'primary_color' => '#E07A5F',
                'secondary_color' => '#81B29A',
                'accent_color' => '#F2CC8F',
                'ticker_enabled' => true,
                'ticker_text' => 'Welcome to our Kitchen, our delicious and freshly meals are ready for you to order now | Place your order now | Don\'t forget we run referral discounts and end of day special offer, turn on notification to get alert when we have it.',
            ],
        );
    }

    /**
     * @return array<string, mixed>
     */
    public function resolveEffective(TenantBranding $branding): array
    {
        $platformSettings = app(\App\Modules\Platform\Application\Services\PlatformSettingsService::class)->get();

        return [
            'id' => $branding->id,
            'tenant_id' => $branding->tenant_id,
            'restaurant_name' => $branding->restaurant_name,
            'logo_url' => $branding->platform_override_logo_url ?? $branding->logo_url,
            'primary_color' => $branding->platform_override_primary_color ?? $branding->primary_color,
            'secondary_color' => $branding->platform_override_secondary_color ?? $branding->secondary_color,
            'accent_color' => $branding->platform_override_accent_color ?? $branding->accent_color,
            'banner_image' => $branding->platform_override_banner_image ?? $branding->banner_image,
            'ticker_enabled' => $this->resolveTickerEnabled($branding, $platformSettings),
            'ticker_text' => $this->resolveTickerText($branding, $platformSettings),
            'has_platform_override' => $this->hasPlatformOverride($branding),
        ];
    }

    private function resolveTickerEnabled(TenantBranding $branding, $platformSettings): bool
    {
        if ($branding->platform_override_ticker_enabled !== null) {
            return (bool) $branding->platform_override_ticker_enabled;
        }

        if (! ($platformSettings->ticker_enabled ?? true)) {
            return false;
        }

        return (bool) ($branding->ticker_enabled ?? true);
    }

    private function resolveTickerText(TenantBranding $branding, $platformSettings): ?string
    {
        if ($branding->platform_override_ticker_text) {
            return $branding->platform_override_ticker_text;
        }

        if ($branding->ticker_text) {
            return $branding->ticker_text;
        }

        return $platformSettings->ticker_text;
    }

    public function hasPlatformOverride(TenantBranding $branding): bool
    {
        return $branding->platform_override_logo_url
            || $branding->platform_override_primary_color
            || $branding->platform_override_secondary_color
            || $branding->platform_override_accent_color
            || $branding->platform_override_banner_image
            || $branding->platform_override_ticker_enabled !== null
            || $branding->platform_override_ticker_text;
    }

    public function update(array $data, array $permissions): TenantBranding
    {
        $this->permissionService->authorize($permissions, 'branding.manage');

        $branding = $this->getForTenant();
        $branding->update($data);

        $this->auditLogService->log(
            'branding.updated',
            $branding->tenant_id,
            $this->tenantContext->user()?->id,
            'tenant_branding',
            $branding->id,
            $data,
        );

        return $branding->fresh();
    }

    public function updatePlatformOverride(string $tenantId, array $data): TenantBranding
    {
        $branding = $this->getForTenant($tenantId);

        $branding->update([
            'platform_override_logo_url' => $data['logo_url'] ?? $branding->platform_override_logo_url,
            'platform_override_primary_color' => $data['primary_color'] ?? $branding->platform_override_primary_color,
            'platform_override_secondary_color' => $data['secondary_color'] ?? $branding->platform_override_secondary_color,
            'platform_override_accent_color' => $data['accent_color'] ?? $branding->platform_override_accent_color,
            'platform_override_banner_image' => $data['banner_image'] ?? $branding->platform_override_banner_image,
            'platform_override_ticker_enabled' => array_key_exists('ticker_enabled', $data)
                ? $data['ticker_enabled']
                : $branding->platform_override_ticker_enabled,
            'platform_override_ticker_text' => $data['ticker_text'] ?? $branding->platform_override_ticker_text,
        ]);

        $this->auditLogService->log(
            'branding.platform_override',
            $tenantId,
            $this->tenantContext->user()?->id,
            'tenant_branding',
            $branding->id,
            $data,
        );

        return $branding->fresh();
    }

    public function clearPlatformOverride(string $tenantId): TenantBranding
    {
        $branding = $this->getForTenant($tenantId);

        $branding->update([
            'platform_override_logo_url' => null,
            'platform_override_primary_color' => null,
            'platform_override_secondary_color' => null,
            'platform_override_accent_color' => null,
            'platform_override_banner_image' => null,
            'platform_override_ticker_enabled' => null,
            'platform_override_ticker_text' => null,
        ]);

        $this->auditLogService->log(
            'branding.platform_override_cleared',
            $tenantId,
            $this->tenantContext->user()?->id,
            'tenant_branding',
            $branding->id,
            [],
        );

        return $branding->fresh();
    }

    public function uploadLogo(UploadedFile $file, array $permissions): TenantBranding
    {
        $this->permissionService->authorize($permissions, 'branding.manage');

        $branding = $this->getForTenant();
        $tenantId = $branding->tenant_id;
        $path = $file->store("branding/{$tenantId}", 'public');
        $url = Storage::disk('public')->url($path);

        $branding->update(['logo_url' => $url]);

        $this->auditLogService->log(
            'branding.logo_uploaded',
            $tenantId,
            $this->tenantContext->user()?->id,
            'tenant_branding',
            $branding->id,
            ['logo_url' => $url],
        );

        return $branding->fresh();
    }

    public function uploadBanner(UploadedFile $file, array $permissions): TenantBranding
    {
        $this->permissionService->authorize($permissions, 'branding.manage');

        $branding = $this->getForTenant();
        $tenantId = $branding->tenant_id;
        $path = $file->store("branding/{$tenantId}", 'public');
        $url = Storage::disk('public')->url($path);

        $branding->update(['banner_image' => $url]);

        $this->auditLogService->log(
            'branding.banner_uploaded',
            $tenantId,
            $this->tenantContext->user()?->id,
            'tenant_branding',
            $branding->id,
            ['banner_image' => $url],
        );

        return $branding->fresh();
    }

    public function uploadPlatformOverrideLogo(string $tenantId, UploadedFile $file): TenantBranding
    {
        $branding = $this->getForTenant($tenantId);
        $path = $file->store("branding/platform/{$tenantId}", 'public');
        $url = Storage::disk('public')->url($path);

        $branding->update(['platform_override_logo_url' => $url]);

        $this->auditLogService->log(
            'branding.platform_logo_uploaded',
            $tenantId,
            $this->tenantContext->user()?->id,
            'tenant_branding',
            $branding->id,
            ['logo_url' => $url],
        );

        return $branding->fresh();
    }

    public function uploadPlatformOverrideBanner(string $tenantId, UploadedFile $file): TenantBranding
    {
        $branding = $this->getForTenant($tenantId);
        $path = $file->store("branding/platform/{$tenantId}", 'public');
        $url = Storage::disk('public')->url($path);

        $branding->update(['platform_override_banner_image' => $url]);

        $this->auditLogService->log(
            'branding.platform_banner_uploaded',
            $tenantId,
            $this->tenantContext->user()?->id,
            'tenant_branding',
            $branding->id,
            ['banner_image' => $url],
        );

        return $branding->fresh();
    }
}
