<?php

namespace App\Modules\TenantBranding\Interfaces\Controllers;

use App\Modules\TenantBranding\Application\Services\RestaurantStatusService;
use App\Shared\Utils\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;

class PlatformRestaurantStatusController extends Controller
{
    public function __construct(private RestaurantStatusService $statusService) {}

    public function update(Request $request, string $tenantId)
    {
        $data = $request->validate([
            'status' => ['required', 'in:open,closing_soon,closed,promo_mode'],
            'promo_alerts_enabled' => ['nullable', 'boolean'],
            'reason' => ['nullable', 'string', 'max:500'],
        ]);

        app(\App\Shared\Tenancy\TenantContext::class)->setTenant(
            \App\Modules\Auth\Domain\Models\Tenant::withoutGlobalScopes()->findOrFail($tenantId),
        );

        $status = $this->statusService->updateStatus(
            $data['status'],
            [],
            $data['promo_alerts_enabled'] ?? null,
            $data['reason'] ?? null,
            true,
        );

        return ApiResponse::success(['status' => $status]);
    }
}
