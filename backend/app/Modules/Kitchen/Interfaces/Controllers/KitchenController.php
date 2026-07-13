<?php

namespace App\Modules\Kitchen\Interfaces\Controllers;

use App\Modules\Orders\Application\Services\OrderService;
use App\Shared\Utils\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;

class KitchenController extends Controller
{
    public function __construct(private OrderService $orderService) {}

    public function index(Request $request)
    {
        return ApiResponse::success([
            'orders' => $this->orderService->getKitchenOrders($request->get('permissions', [])),
        ]);
    }

    public function update(Request $request, string $id)
    {
        $data = $request->validate([
            'status' => ['required', 'in:accepted,preparing,ready,completed,cancelled'],
        ]);

        $order = $this->orderService->updateStatus($id, $data['status'], $request->get('permissions', []));

        return ApiResponse::success(['order' => $order]);
    }
}
