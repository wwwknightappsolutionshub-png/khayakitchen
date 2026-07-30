<?php

namespace App\Modules\Orders\Interfaces\Controllers;

use App\Modules\Orders\Application\Services\PaymentAccountsService;
use App\Shared\Utils\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;

class PaymentAccountsController extends Controller
{
    public function __construct(private PaymentAccountsService $paymentAccountsService) {}

    public function index(Request $request)
    {
        return ApiResponse::success([
            'accounts' => $this->paymentAccountsService->listAccounts($request->get('permissions', [])),
        ]);
    }

    public function verify(Request $request, string $orderId)
    {
        $row = $this->paymentAccountsService->verifyPayment(
            $orderId,
            $request->get('permissions', []),
        );

        return ApiResponse::success(['account' => $row]);
    }
}
