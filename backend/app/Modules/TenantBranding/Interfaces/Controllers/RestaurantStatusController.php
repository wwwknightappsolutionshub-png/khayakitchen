<?php

namespace App\Modules\TenantBranding\Interfaces\Controllers;

use App\Modules\TenantBranding\Application\Services\RestaurantStatusService;
use App\Shared\Utils\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;

class RestaurantStatusController extends Controller
{
    public function __construct(private RestaurantStatusService $statusService) {}

    public function show()
    {
        return ApiResponse::success([
            'status' => $this->statusService->getForTenant(),
        ]);
    }

    public function update(Request $request)
    {
        $data = $request->validate([
            'status' => ['required', 'in:open,closing_soon,closed,promo_mode'],
            'promo_alerts_enabled' => ['nullable', 'boolean'],
        ]);

        $status = $this->statusService->updateStatus(
            $data['status'],
            $request->get('permissions', []),
            $data['promo_alerts_enabled'] ?? null,
        );

        return ApiResponse::success(['status' => $status]);
    }
}
