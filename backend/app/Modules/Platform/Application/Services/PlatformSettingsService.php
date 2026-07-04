<?php

namespace App\Modules\Platform\Application\Services;

use App\Modules\Platform\Domain\Models\PlatformSettings;
use App\Modules\Pricing\Application\Services\AuditLogService;
use App\Shared\Tenancy\TenantContext;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

class PlatformSettingsService
{
    public function __construct(
        private TenantContext $tenantContext,
        private AuditLogService $auditLogService,
    ) {}

    public function get(): PlatformSettings
    {
        return PlatformSettings::query()->firstOrCreate([], [
            'app_name' => 'KhayaOS',
            'primary_color' => '#004D40',
            'secondary_color' => '#81B29A',
            'accent_color' => '#F2CC8F',
            'background_color' => '#F4F1DE',
            'splash_enabled' => true,
            'splash_headline' => "LET'S GET STARTED",
            'splash_subheadline' => 'Order fresh meals from your favourite kitchen',
            'ticker_enabled' => true,
            'ticker_text' => 'Welcome to our Kitchen, our delicious and freshly meals are ready for you to order now | Place your order now | Don\'t forget we run referral discounts and end of day special offer, turn on notification to get alert when we have it.',
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    public function toPublicArray(PlatformSettings $settings): array
    {
        return [
            'app_name' => $settings->app_name,
            'logo_url' => $settings->logo_url,
            'primary_color' => $settings->primary_color,
            'secondary_color' => $settings->secondary_color,
            'accent_color' => $settings->accent_color,
            'background_color' => $settings->background_color,
            'splash_enabled' => $settings->splash_enabled,
            'splash_headline' => $settings->splash_headline,
            'splash_subheadline' => $settings->splash_subheadline,
            'splash_image_url' => $settings->splash_image_url,
            'ticker_enabled' => $settings->ticker_enabled,
            'ticker_text' => $settings->ticker_text,
        ];
    }

    public function update(array $data): PlatformSettings
    {
        $settings = $this->get();
        $settings->update($data);

        $this->auditLogService->log(
            'platform.settings_updated',
            null,
            $this->tenantContext->user()?->id,
            'platform_settings',
            $settings->id,
            $data,
        );

        return $settings->fresh();
    }

    public function uploadLogo(UploadedFile $file): PlatformSettings
    {
        $settings = $this->get();
        $path = $file->store('platform/branding', 'public');
        $url = Storage::disk('public')->url($path);

        $settings->update(['logo_url' => $url]);

        $this->auditLogService->log(
            'platform.logo_uploaded',
            null,
            $this->tenantContext->user()?->id,
            'platform_settings',
            $settings->id,
            ['logo_url' => $url],
        );

        return $settings->fresh();
    }

    public function uploadSplashImage(UploadedFile $file): PlatformSettings
    {
        $settings = $this->get();
        $path = $file->store('platform/splash', 'public');
        $url = Storage::disk('public')->url($path);

        $settings->update(['splash_image_url' => $url]);

        $this->auditLogService->log(
            'platform.splash_image_uploaded',
            null,
            $this->tenantContext->user()?->id,
            'platform_settings',
            $settings->id,
            ['splash_image_url' => $url],
        );

        return $settings->fresh();
    }
}
