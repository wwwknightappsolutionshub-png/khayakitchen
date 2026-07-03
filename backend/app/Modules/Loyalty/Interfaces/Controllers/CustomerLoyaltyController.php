<?php

namespace App\Modules\Loyalty\Interfaces\Controllers;

use App\Modules\CRM\Domain\Models\Customer;
use App\Modules\Loyalty\Application\Services\LoyaltyService;
use App\Shared\Utils\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;

class CustomerLoyaltyController extends Controller
{
    public function __construct(private LoyaltyService $loyaltyService) {}

    public function show(Request $request, string $customerId)
    {
        $data = $request->validate([
            'phone' => ['required', 'string', 'max:50'],
        ]);

        $customer = Customer::where('id', $customerId)->where('phone', $data['phone'])->firstOrFail();

        return ApiResponse::success([
            'loyalty' => $this->loyaltyService->getAccountPublic($customer->id),
        ]);
    }
}
