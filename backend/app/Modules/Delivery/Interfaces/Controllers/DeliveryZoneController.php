<?php

namespace App\Modules\Delivery\Interfaces\Controllers;

use App\Modules\Delivery\Application\Services\DeliveryZoneService;
use App\Shared\Utils\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;

class DeliveryZoneController extends Controller
{
    public function __construct(private DeliveryZoneService $zoneService) {}

    public function index(Request $request)
    {
        return ApiResponse::success(['zones' => $this->zoneService->list($request->get('permissions', []))]);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'fee' => ['nullable', 'numeric', 'min:0'],
            'postcodes' => ['nullable', 'array'],
        ]);

        $zone = $this->zoneService->create($data, $request->get('permissions', []));

        return ApiResponse::success(['zone' => $zone], 201);
    }

    public function update(Request $request, string $id)
    {
        $data = $request->validate([
            'name' => ['sometimes', 'string', 'max:255'],
            'fee' => ['nullable', 'numeric', 'min:0'],
            'postcodes' => ['nullable', 'array'],
        ]);

        $zone = $this->zoneService->update($id, $data, $request->get('permissions', []));

        return ApiResponse::success(['zone' => $zone]);
    }

    public function destroy(Request $request, string $id)
    {
        $this->zoneService->delete($id, $request->get('permissions', []));

        return ApiResponse::success(['deleted' => true]);
    }
}
