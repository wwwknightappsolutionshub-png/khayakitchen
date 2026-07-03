<?php

namespace App\Modules\Delivery\Interfaces\Controllers;

use App\Modules\Delivery\Application\Services\DeliveryService;
use App\Shared\Utils\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;

class DeliveryController extends Controller
{
    public function __construct(private DeliveryService $deliveryService) {}

    public function store(Request $request)
    {
        $data = $request->validate([
            'order_id' => ['required', 'uuid'],
            'driver_name' => ['nullable', 'string'],
        ]);

        $delivery = $this->deliveryService->create($data, $request->get('permissions', []));

        return ApiResponse::success(['delivery' => $delivery], 201);
    }

    public function updateStatus(Request $request, string $id)
    {
        $data = $request->validate([
            'status' => ['required', 'in:pending,assigned,picked_up,delivered'],
        ]);

        $delivery = $this->deliveryService->updateStatus($id, $data['status'], $request->get('permissions', []));

        return ApiResponse::success(['delivery' => $delivery]);
    }
}
