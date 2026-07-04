<?php

namespace App\Modules\TenantBranding\Interfaces\Controllers;

use App\Modules\TenantBranding\Application\Services\BrandingService;
use App\Shared\Utils\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;

class PlatformBrandingController extends Controller
{
    public function __construct(private BrandingService $brandingService) {}

    public function update(Request $request, string $tenantId)
    {
        $data = $request->validate([
            'logo_url' => ['nullable', 'string', 'max:2048'],
            'primary_color' => ['nullable', 'string', 'max:32'],
            'secondary_color' => ['nullable', 'string', 'max:32'],
            'accent_color' => ['nullable', 'string', 'max:32'],
            'banner_image' => ['nullable', 'string', 'max:2048'],
            'ticker_enabled' => ['nullable', 'boolean'],
            'ticker_text' => ['nullable', 'string', 'max:2000'],
        ]);

        $branding = $this->brandingService->updatePlatformOverride($tenantId, $data);

        return ApiResponse::success([
            'branding' => $this->brandingService->resolveEffective($branding),
        ]);
    }

    public function uploadLogo(Request $request, string $tenantId)
    {
        $request->validate([
            'image' => ['required', 'image', 'max:5120'],
        ]);

        $branding = $this->brandingService->uploadPlatformOverrideLogo(
            $tenantId,
            $request->file('image'),
        );

        return ApiResponse::success([
            'branding' => $this->brandingService->resolveEffective($branding),
        ]);
    }

    public function uploadBanner(Request $request, string $tenantId)
    {
        $request->validate([
            'image' => ['required', 'image', 'max:5120'],
        ]);

        $branding = $this->brandingService->uploadPlatformOverrideBanner(
            $tenantId,
            $request->file('image'),
        );

        return ApiResponse::success([
            'branding' => $this->brandingService->resolveEffective($branding),
        ]);
    }

    public function clear(string $tenantId)
    {
        $branding = $this->brandingService->clearPlatformOverride($tenantId);

        return ApiResponse::success([
            'branding' => $this->brandingService->resolveEffective($branding),
        ]);
    }
}
