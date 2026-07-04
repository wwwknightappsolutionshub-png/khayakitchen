<?php

namespace App\Modules\Platform\Interfaces\Controllers;

use App\Modules\Platform\Application\Services\PlatformSettingsService;
use App\Shared\Utils\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;

class PlatformSettingsController extends Controller
{
    public function __construct(private PlatformSettingsService $platformSettingsService) {}

    public function show()
    {
        $settings = $this->platformSettingsService->get();

        return ApiResponse::success([
            'settings' => $this->platformSettingsService->toPublicArray($settings),
        ]);
    }

    public function update(Request $request)
    {
        $data = $request->validate([
            'app_name' => ['sometimes', 'string', 'max:120'],
            'primary_color' => ['nullable', 'string', 'max:32'],
            'secondary_color' => ['nullable', 'string', 'max:32'],
            'accent_color' => ['nullable', 'string', 'max:32'],
            'background_color' => ['nullable', 'string', 'max:32'],
            'splash_enabled' => ['sometimes', 'boolean'],
            'splash_headline' => ['nullable', 'string', 'max:160'],
            'splash_subheadline' => ['nullable', 'string', 'max:255'],
            'ticker_enabled' => ['sometimes', 'boolean'],
            'ticker_text' => ['nullable', 'string', 'max:2000'],
        ]);

        $settings = $this->platformSettingsService->update($data);

        return ApiResponse::success([
            'settings' => $this->platformSettingsService->toPublicArray($settings),
        ]);
    }

    public function uploadLogo(Request $request)
    {
        $request->validate([
            'image' => ['required', 'image', 'max:5120'],
        ]);

        $settings = $this->platformSettingsService->uploadLogo($request->file('image'));

        return ApiResponse::success([
            'settings' => $this->platformSettingsService->toPublicArray($settings),
        ]);
    }

    public function uploadSplashImage(Request $request)
    {
        $request->validate([
            'image' => ['required', 'image', 'max:5120'],
        ]);

        $settings = $this->platformSettingsService->uploadSplashImage($request->file('image'));

        return ApiResponse::success([
            'settings' => $this->platformSettingsService->toPublicArray($settings),
        ]);
    }

    public function publicConfig()
    {
        $settings = $this->platformSettingsService->get();

        return ApiResponse::success(
            $this->platformSettingsService->toPublicArray($settings),
        );
    }
}
