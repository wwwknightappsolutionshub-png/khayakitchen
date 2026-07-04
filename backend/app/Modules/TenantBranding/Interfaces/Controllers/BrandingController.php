<?php

namespace App\Modules\TenantBranding\Interfaces\Controllers;

use App\Modules\TenantBranding\Application\Services\BrandingService;
use App\Shared\Utils\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;

class BrandingController extends Controller
{
    public function __construct(private BrandingService $brandingService) {}

    public function show()
    {
        return ApiResponse::success([
            'branding' => $this->brandingService->getForTenant(),
        ]);
    }

    public function update(Request $request)
    {
        $data = $request->validate([
            'restaurant_name' => ['sometimes', 'string', 'max:120'],
            'logo_url' => ['nullable', 'string', 'max:2048'],
            'primary_color' => ['nullable', 'string', 'max:20'],
            'secondary_color' => ['nullable', 'string', 'max:20'],
            'banner_image' => ['nullable', 'string', 'max:2048'],
        ]);

        $branding = $this->brandingService->update($data, $request->get('permissions', []));

        return ApiResponse::success(['branding' => $branding]);
    }

    public function uploadLogo(Request $request)
    {
        $request->validate([
            'image' => ['required', 'image', 'max:5120'],
        ]);

        $branding = $this->brandingService->uploadLogo(
            $request->file('image'),
            $request->get('permissions', []),
        );

        return ApiResponse::success(['branding' => $branding]);
    }

    public function uploadBanner(Request $request)
    {
        $request->validate([
            'image' => ['required', 'image', 'max:5120'],
        ]);

        $branding = $this->brandingService->uploadBanner(
            $request->file('image'),
            $request->get('permissions', []),
        );

        return ApiResponse::success(['branding' => $branding]);
    }
}
