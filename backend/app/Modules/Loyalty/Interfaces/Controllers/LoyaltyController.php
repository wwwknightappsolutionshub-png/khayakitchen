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
            'loyalty' => $this->loyaltyService->getAccount($customerId, $request->get('permissions', [])),
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
            'loyalty' => $this->loyaltyService->earn($data, $request->get('permissions', [])),
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
            'loyalty' => $this->loyaltyService->redeem($data, $request->get('permissions', [])),
        ]);
    }

    public function pendingVouchers(Request $request)
    {
        return ApiResponse::success([
            'vouchers' => $this->loyaltyService->listPendingVouchers($request->get('permissions', [])),
        ]);
    }

    public function fulfilVoucher(Request $request, string $id)
    {
        $result = $this->loyaltyService->fulfilVoucher(
            $id,
            $request->get('permissions', []),
            $request->user()?->id,
        );

        return ApiResponse::success($result);
    }

    public function cancelVoucher(Request $request, string $id)
    {
        $result = $this->loyaltyService->cancelVoucher(
            $id,
            $request->get('permissions', []),
            $request->user()?->id,
        );

        return ApiResponse::success($result);
    }
}
