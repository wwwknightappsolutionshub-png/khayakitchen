<?php

namespace App\Modules\Inventory\Interfaces\Controllers;

use App\Modules\Inventory\Application\Services\InventoryService;
use App\Shared\Utils\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;

class InventoryController extends Controller
{
    public function __construct(private InventoryService $inventoryService) {}

    public function index(Request $request)
    {
        return ApiResponse::success([
            'items' => $this->inventoryService->listItems($request->get('permissions', [])),
        ]);
    }

    public function stockIn(Request $request)
    {
        $data = $request->validate([
            'item_id' => ['required', 'uuid'],
            'quantity' => ['required', 'numeric', 'min:0.0001'],
            'cost_per_unit' => ['nullable', 'numeric', 'min:0'],
        ]);

        return ApiResponse::success([
            'item' => $this->inventoryService->stockIn($data, $request->get('permissions', [])),
        ], 201);
    }

    public function consume(Request $request)
    {
        $data = $request->validate([
            'item_id' => ['nullable', 'uuid'],
            'order_id' => ['nullable', 'uuid'],
            'quantity' => ['nullable', 'numeric', 'min:0.0001'],
            'reference_type' => ['nullable', 'string'],
            'reference_id' => ['nullable', 'uuid'],
        ]);

        return ApiResponse::success(
            $this->inventoryService->consume($data, $request->get('permissions', [])),
        );
    }

    public function waste(Request $request)
    {
        $data = $request->validate([
            'item_id' => ['required', 'uuid'],
            'quantity' => ['required', 'numeric', 'min:0.0001'],
        ]);

        return ApiResponse::success([
            'item' => $this->inventoryService->logWaste($data, $request->get('permissions', [])),
        ], 201);
    }
}
