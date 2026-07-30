<?php

namespace App\Modules\Orders\Interfaces\Controllers;

use App\Modules\Orders\Application\Services\OrderService;
use App\Modules\Orders\Application\Services\PaymentAccountsService;
use App\Shared\Utils\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;

class CustomerOrderController extends Controller
{
    public function __construct(
        private OrderService $orderService,
        private PaymentAccountsService $paymentAccountsService,
    ) {}

    public function store(Request $request)
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'phone' => ['required', 'string', 'max:50'],
            'order_type' => ['required', 'in:pickup,delivery'],
            'address' => ['required_if:order_type,delivery', 'nullable', 'string', 'max:500'],
            'scheduled_time' => ['nullable', 'date'],
            'payment_method' => ['nullable', 'in:card,transfer'],
            'email' => ['nullable', 'email', 'max:255'],
            'referral_token' => ['nullable', 'string', 'max:80'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.meal_id' => ['required', 'uuid'],
            'items.*.quantity' => ['nullable', 'integer', 'min:1'],
            'items.*.options' => ['nullable', 'array'],
            'items.*.options.*.option_id' => ['required', 'uuid'],
        ]);

        return ApiResponse::success(
            $this->orderService->createCustomerOrder($data),
            201,
        );
    }

    public function index(Request $request)
    {
        $data = $request->validate([
            'phone' => ['required', 'string', 'max:50'],
        ]);

        return ApiResponse::success($this->orderService->listCustomerOrders($data['phone']));
    }

    public function show(Request $request, string $id)
    {
        $data = $request->validate([
            'phone' => ['required', 'string', 'max:50'],
        ]);

        $order = $this->orderService->showCustomerOrder($id, $data['phone']);

        return ApiResponse::success(['order' => $order]);
    }

    public function uploadPaymentProof(Request $request, string $id)
    {
        $data = $request->validate([
            'phone' => ['required', 'string', 'max:50'],
            'proof' => ['required', 'file', 'mimes:png,jpg,jpeg,pdf', 'max:'.PaymentAccountsService::PROOF_MAX_KB],
        ]);

        $payment = $this->paymentAccountsService->uploadProof(
            $id,
            $data['phone'],
            $request->file('proof'),
        );

        return ApiResponse::success(['payment' => $payment]);
    }
}
