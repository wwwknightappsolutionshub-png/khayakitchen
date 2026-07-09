<?php

namespace App\Modules\RevenueRecovery\Interfaces\Controllers;

use App\Modules\RevenueRecovery\Application\Services\CustomerProximityAuthService;
use App\Modules\RevenueRecovery\Domain\Models\CustomerSession;
use App\Shared\Utils\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;

class CustomerProximityAuthController extends Controller
{
    public function __construct(private CustomerProximityAuthService $authService) {}

    public function requestOtp(Request $request)
    {
        $data = $request->validate([
            'phone' => ['required', 'string', 'max:32'],
            'email' => ['required', 'email', 'max:255'],
        ]);

        return ApiResponse::success($this->authService->requestOtp($data['phone'], $data['email']));
    }

    public function verifyOtp(Request $request)
    {
        $data = $request->validate([
            'phone' => ['required', 'string', 'max:32'],
            'email' => ['required', 'email', 'max:255'],
            'otp' => ['required', 'string', 'size:6'],
        ]);

        return ApiResponse::success($this->authService->verifyOtp(
            $data['phone'],
            $data['email'],
            $data['otp'],
        ));
    }

    public function updateLocationOptIn(Request $request)
    {
        /** @var CustomerSession $session */
        $session = $request->attributes->get('customer_session');

        $data = $request->validate([
            'location_opt_in' => ['required', 'boolean'],
        ]);

        $updated = $this->authService->updateLocationOptIn($session, (bool) $data['location_opt_in']);

        return ApiResponse::success([
            'location_opt_in' => $updated->location_opt_in,
        ]);
    }
}
