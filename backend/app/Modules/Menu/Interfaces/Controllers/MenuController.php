<?php

namespace App\Modules\Menu\Interfaces\Controllers;

use App\Modules\Menu\Application\Services\MenuService;
use App\Shared\Utils\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;

class MenuController extends Controller
{
    public function __construct(private MenuService $menuService) {}

    public function index()
    {
        return ApiResponse::success($this->menuService->getMenu());
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'image_url' => ['nullable', 'string'],
            'base_price' => ['nullable', 'numeric', 'min:0'],
            'is_active' => ['nullable', 'boolean'],
        ]);

        $meal = $this->menuService->createMeal($data, $request->get('permissions', []));

        return ApiResponse::success(['meal' => $meal], 201);
    }

    public function update(Request $request, string $id)
    {
        $data = $request->validate([
            'name' => ['sometimes', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'image_url' => ['nullable', 'string'],
            'base_price' => ['nullable', 'numeric', 'min:0'],
            'is_active' => ['nullable', 'boolean'],
        ]);

        $meal = $this->menuService->updateMeal($id, $data, $request->get('permissions', []));

        return ApiResponse::success(['meal' => $meal]);
    }

    public function adminIndex(Request $request)
    {
        return ApiResponse::success($this->menuService->listMealsAdmin($request->get('permissions', [])));
    }

    public function destroy(Request $request, string $id)
    {
        $this->menuService->deleteMeal($id, $request->get('permissions', []));

        return ApiResponse::success(['deleted' => true]);
    }

    public function storeOptionGroup(Request $request)
    {
        $data = $request->validate([
            'meal_id' => ['required', 'uuid'],
            'name' => ['required', 'string', 'max:255'],
            'type' => ['nullable', 'in:single,multiple'],
        ]);

        $group = $this->menuService->createOptionGroup($data, $request->get('permissions', []));

        return ApiResponse::success(['option_group' => $group], 201);
    }

    public function updateOptionGroup(Request $request, string $id)
    {
        $data = $request->validate([
            'name' => ['sometimes', 'string', 'max:255'],
            'type' => ['sometimes', 'in:single,multiple'],
        ]);

        $group = $this->menuService->updateOptionGroup($id, $data, $request->get('permissions', []));

        return ApiResponse::success(['option_group' => $group]);
    }

    public function destroyOptionGroup(Request $request, string $id)
    {
        $this->menuService->deleteOptionGroup($id, $request->get('permissions', []));

        return ApiResponse::success(['deleted' => true]);
    }

    public function storeMealOption(Request $request)
    {
        $data = $request->validate([
            'option_group_id' => ['required', 'uuid'],
            'name' => ['required', 'string', 'max:255'],
            'price_delta' => ['nullable', 'numeric'],
            'is_active' => ['nullable', 'boolean'],
            'inventory_impact' => ['nullable', 'array'],
        ]);

        $option = $this->menuService->createMealOption($data, $request->get('permissions', []));

        return ApiResponse::success(['meal_option' => $option], 201);
    }

    public function updateMealOption(Request $request, string $id)
    {
        $data = $request->validate([
            'name' => ['sometimes', 'string', 'max:255'],
            'price_delta' => ['nullable', 'numeric'],
            'is_active' => ['nullable', 'boolean'],
            'inventory_impact' => ['nullable', 'array'],
        ]);

        $option = $this->menuService->updateMealOption($id, $data, $request->get('permissions', []));

        return ApiResponse::success(['meal_option' => $option]);
    }

    public function destroyMealOption(Request $request, string $id)
    {
        $this->menuService->deleteMealOption($id, $request->get('permissions', []));

        return ApiResponse::success(['deleted' => true]);
    }

    public function uploadMealImage(Request $request, string $id)
    {
        $request->validate([
            'image' => ['required', 'image', 'max:5120'],
        ]);

        $meal = $this->menuService->uploadMealImage(
            $id,
            $request->file('image'),
            $request->get('permissions', []),
        );

        return ApiResponse::success(['meal' => $meal]);
    }
}
