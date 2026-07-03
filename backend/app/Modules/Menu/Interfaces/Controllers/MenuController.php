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
}
