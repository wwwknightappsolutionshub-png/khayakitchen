<?php

namespace App\Modules\RevenueRecovery\Interfaces\Controllers;

use App\Modules\RevenueRecovery\Application\Services\TenantRevenueRecoverySettingsService;
use App\Shared\Tenancy\TenantContext;
use App\Shared\Utils\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;

class PlatformRevenueRecoveryController extends Controller
{
    public function __construct(
        private TenantRevenueRecoverySettingsService $settingsService,
        private TenantContext $tenantContext,
    ) {}

    public function index()
    {
        return ApiResponse::success([
            'tenants' => $this->settingsService->platformList(),
        ]);
    }

    public function show(string $tenantId)
    {
        return ApiResponse::success($this->settingsService->platformShow($tenantId));
    }

    public function update(Request $request, string $tenantId)
    {
        $data = $request->validate([
            'time_based_enabled' => ['nullable', 'boolean'],
            'proximity_enabled' => ['nullable', 'boolean'],
            'geofence_radius_km' => ['nullable', 'numeric', 'min:1', 'max:50'],
            'tenant_can_edit_radius' => ['nullable', 'boolean'],
            'kitchen_address_text' => ['nullable', 'string', 'max:500'],
            'proximity_bait_tiers' => ['nullable', 'array'],
            'proximity_bait_tiers.*.min_km' => ['required_with:proximity_bait_tiers', 'numeric', 'min:0'],
            'proximity_bait_tiers.*.max_km' => ['required_with:proximity_bait_tiers', 'numeric', 'min:0'],
            'proximity_bait_tiers.*.urgency_label' => ['required_with:proximity_bait_tiers', 'string', 'max:120'],
            'max_daily_proximity_pushes_per_customer' => ['nullable', 'integer', 'min:1', 'max:5'],
            'location_accuracy_max_meters' => ['nullable', 'integer', 'min:50', 'max:2000'],
        ]);

        $settings = $this->settingsService->platformUpdate(
            $tenantId,
            $data,
            $this->tenantContext->user()?->id,
        );

        return ApiResponse::success([
            'settings' => $this->settingsService->platformShow($tenantId),
        ]);
    }
}
