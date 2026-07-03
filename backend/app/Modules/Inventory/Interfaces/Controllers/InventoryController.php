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

    public function adjustment(Request $request)
    {
        $data = $request->validate([
            'item_id' => ['required', 'uuid'],
            'quantity' => ['required', 'numeric'],
        ]);

        return ApiResponse::success([
            'item' => $this->inventoryService->adjustStock($data, $request->get('permissions', [])),
        ], 201);
    }

    public function transactions(Request $request)
    {
        return ApiResponse::success([
            'transactions' => $this->inventoryService->listTransactions(
                $request->get('permissions', []),
                $request->query('item_id'),
            ),
        ]);
    }

    public function storeItem(Request $request)
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'unit' => ['nullable', 'in:kg,g,liter,unit'],
            'current_stock' => ['nullable', 'numeric', 'min:0'],
            'reorder_level' => ['nullable', 'numeric', 'min:0'],
            'cost_per_unit' => ['nullable', 'numeric', 'min:0'],
        ]);

        return ApiResponse::success([
            'item' => $this->inventoryService->createItem($data, $request->get('permissions', [])),
        ], 201);
    }

    public function updateItem(Request $request, string $id)
    {
        $data = $request->validate([
            'name' => ['sometimes', 'string', 'max:255'],
            'unit' => ['sometimes', 'in:kg,g,liter,unit'],
            'reorder_level' => ['nullable', 'numeric', 'min:0'],
            'cost_per_unit' => ['nullable', 'numeric', 'min:0'],
        ]);

        return ApiResponse::success([
            'item' => $this->inventoryService->updateItem($id, $data, $request->get('permissions', [])),
        ]);
    }
}
