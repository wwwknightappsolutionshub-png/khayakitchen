<?php

namespace App\Modules\Loyalty\Interfaces\Controllers;

use App\Modules\CRM\Domain\Models\Customer;
use App\Modules\Loyalty\Application\Services\LoyaltyProgramService;
use App\Modules\Loyalty\Application\Services\LoyaltyService;
use App\Shared\Utils\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;

class CustomerLoyaltyController extends Controller
{
    public function __construct(
        private LoyaltyService $loyaltyService,
        private LoyaltyProgramService $loyaltyProgramService,
    ) {}

    public function show(Request $request, string $customerId)
    {
        $data = $request->validate([
            'phone' => ['required', 'string', 'max:50'],
        ]);

        return ApiResponse::success(
            $this->loyaltyProgramService->customerSnapshot($customerId, $data['phone']),
        );
    }

    public function optIn(Request $request)
    {
        $data = $request->validate([
            'customer_id' => ['required', 'uuid'],
            'phone' => ['required', 'string', 'max:50'],
        ]);

        return ApiResponse::success([
            'loyalty' => $this->loyaltyProgramService->optIn($data['customer_id'], $data['phone']),
        ]);
    }

    public function claimInstall(Request $request)
    {
        $data = $request->validate([
            'customer_id' => ['required', 'uuid'],
            'phone' => ['required', 'string', 'max:50'],
            'email' => ['nullable', 'email', 'max:255'],
        ]);

        if (! empty($data['email'])) {
            $customer = \App\Modules\CRM\Domain\Models\Customer::where('id', $data['customer_id'])
                ->where('phone', $data['phone'])
                ->firstOrFail();
            if (! $customer->email) {
                $customer->update(['email' => $data['email']]);
            }
        }

        $result = $this->loyaltyProgramService->claimInstall($data['customer_id'], $data['phone']);

        return ApiResponse::success($result);
    }
}
