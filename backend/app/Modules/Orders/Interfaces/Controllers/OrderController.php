<?php

namespace App\Modules\Orders\Interfaces\Controllers;

use App\Modules\Orders\Application\Services\OrderService;
use App\Shared\Utils\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;

class OrderController extends Controller
{
    public function __construct(private OrderService $orderService) {}

    public function store(Request $request)
    {
        $data = $request->validate([
            'customer_id' => ['nullable', 'uuid'],
            'order_type' => ['required', 'in:pickup,delivery'],
            'scheduled_time' => ['nullable', 'date'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.meal_id' => ['required', 'uuid'],
            'items.*.quantity' => ['nullable', 'integer', 'min:1'],
            'items.*.options' => ['nullable', 'array'],
            'items.*.options.*.option_id' => ['required', 'uuid'],
        ]);

        return ApiResponse::success(
            $this->orderService->createOrder($data, $request->get('permissions', [])),
            201,
        );
    }

    public function index(Request $request)
    {
        $orders = $this->orderService->listOrders(
            $request->query('status'),
            $request->get('permissions', []),
        );

        return ApiResponse::success(['orders' => $orders]);
    }

    public function updateStatus(Request $request, string $id)
    {
        $data = $request->validate([
            'status' => ['required', 'in:pending,accepted,preparing,ready,completed,cancelled'],
        ]);

        $order = $this->orderService->updateStatus($id, $data['status'], $request->get('permissions', []));

        return ApiResponse::success(['order' => $order]);
    }

    public function cancel(Request $request, string $id)
    {
        $order = $this->orderService->cancelOrder($id, $request->get('permissions', []));

        return ApiResponse::success(['order' => $order]);
    }
}
