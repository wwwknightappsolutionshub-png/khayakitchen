<?php

namespace App\Modules\RevenueRecovery\Interfaces\Controllers;

use App\Modules\RevenueRecovery\Application\Services\TenantRevenueRecoverySettingsService;
use App\Shared\Utils\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;

class TenantRevenueRecoverySettingsController extends Controller
{
    public function __construct(private TenantRevenueRecoverySettingsService $settingsService) {}

    public function show(Request $request)
    {
        return ApiResponse::success($this->settingsService->tenantShow($request->get('permissions', [])));
    }

    public function update(Request $request)
    {
        $data = $request->validate([
            'geofence_radius_km' => ['nullable', 'numeric', 'min:1', 'max:50'],
            'kitchen_address_text' => ['nullable', 'string', 'max:500'],
            'proximity_bait_tiers' => ['nullable', 'array'],
            'proximity_bait_tiers.*.min_km' => ['required_with:proximity_bait_tiers', 'numeric', 'min:0'],
            'proximity_bait_tiers.*.max_km' => ['required_with:proximity_bait_tiers', 'numeric', 'min:0'],
            'proximity_bait_tiers.*.urgency_label' => ['required_with:proximity_bait_tiers', 'string', 'max:120'],
        ]);

        $settings = $this->settingsService->tenantUpdate($data, $request->get('permissions', []));

        return ApiResponse::success(['settings' => $settings]);
    }
}
