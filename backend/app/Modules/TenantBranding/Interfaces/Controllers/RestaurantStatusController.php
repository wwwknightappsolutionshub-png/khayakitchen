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
            'closing_at' => ['nullable', 'date', 'after:now'],
            'promo_ends_at' => ['nullable', 'date', 'after:now'],
            'promo_meals' => ['nullable', 'array'],
            'promo_meals.*.meal_id' => ['required', 'uuid'],
            'promo_meals.*.discount_percent' => ['required', 'integer', 'min:1', 'max:90'],
        ]);

        $status = $this->statusService->updateStatus(
            $data['status'],
            $request->get('permissions', []),
            $data['promo_alerts_enabled'] ?? null,
            null,
            false,
            isset($data['closing_at']) ? \Carbon\Carbon::parse($data['closing_at']) : null,
            isset($data['promo_ends_at']) ? \Carbon\Carbon::parse($data['promo_ends_at']) : null,
            $data['promo_meals'] ?? null,
        );

        return ApiResponse::success(['status' => $status]);
    }
}
