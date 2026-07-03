<?php

namespace App\Modules\Inventory\Interfaces\Controllers;

use App\Modules\Inventory\Application\Services\InventoryService;
use App\Shared\Utils\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;

class RecipeController extends Controller
{
    public function __construct(private InventoryService $inventoryService) {}

    public function store(Request $request)
    {
        $data = $request->validate([
            'meal_id' => ['required', 'uuid'],
            'portion_size' => ['nullable', 'in:small,medium,large'],
            'components' => ['required', 'array', 'min:1'],
            'components.*.inventory_item_id' => ['required', 'uuid'],
            'components.*.quantity' => ['required', 'numeric', 'min:0.0001'],
        ]);

        $recipe = $this->inventoryService->createRecipe($data, $request->get('permissions', []));

        return ApiResponse::success(['recipe' => $recipe], 201);
    }

    public function index(Request $request)
    {
        $recipes = $this->inventoryService->listRecipes(
            $request->query('meal_id'),
            $request->get('permissions', []),
        );

        return ApiResponse::success(['recipes' => $recipes]);
    }
}
