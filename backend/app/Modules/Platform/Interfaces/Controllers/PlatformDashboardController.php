<?php

namespace App\Modules\Platform\Interfaces\Controllers;

use App\Modules\Platform\Application\Services\PlatformDashboardService;
use App\Shared\Utils\ApiResponse;
use Illuminate\Routing\Controller;

class PlatformDashboardController extends Controller
{
    public function __construct(private PlatformDashboardService $dashboardService) {}

    public function index()
    {
        return ApiResponse::success($this->dashboardService->overview());
    }
}
