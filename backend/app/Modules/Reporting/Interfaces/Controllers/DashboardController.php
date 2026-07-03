<?php

namespace App\Modules\Reporting\Interfaces\Controllers;

use App\Modules\Reporting\Application\Services\DashboardService;
use App\Shared\Utils\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;

class DashboardController extends Controller
{
    public function __construct(private DashboardService $dashboardService) {}

    public function kpis(Request $request)
    {
        return ApiResponse::success($this->dashboardService->kpis($request->get('permissions', [])));
    }

    public function salesTrends(Request $request)
    {
        return ApiResponse::success($this->dashboardService->salesTrends($request->get('permissions', [])));
    }

    public function inventoryHealth(Request $request)
    {
        return ApiResponse::success($this->dashboardService->inventoryHealth($request->get('permissions', [])));
    }
}
