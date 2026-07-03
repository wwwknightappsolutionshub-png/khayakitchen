<?php

namespace App\Modules\Loyalty\Interfaces\Controllers;

use App\Modules\Loyalty\Application\Services\LoyaltyService;
use App\Shared\Utils\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;

class LoyaltyController extends Controller
{
    public function __construct(private LoyaltyService $loyaltyService) {}

    public function show(Request $request, string $customerId)
    {
        return ApiResponse::success([
            'account' => $this->loyaltyService->getAccount($customerId, $request->get('permissions', [])),
        ]);
    }

    public function earn(Request $request)
    {
        $data = $request->validate([
            'customer_id' => ['required', 'uuid'],
            'points' => ['required', 'integer', 'min:1'],
            'reference_id' => ['nullable', 'uuid'],
        ]);

        return ApiResponse::success([
            'account' => $this->loyaltyService->earn($data, $request->get('permissions', [])),
        ]);
    }

    public function redeem(Request $request)
    {
        $data = $request->validate([
            'customer_id' => ['required', 'uuid'],
            'points' => ['required', 'integer', 'min:1'],
            'reference_id' => ['nullable', 'uuid'],
        ]);

        return ApiResponse::success([
            'account' => $this->loyaltyService->redeem($data, $request->get('permissions', [])),
        ]);
    }
}
