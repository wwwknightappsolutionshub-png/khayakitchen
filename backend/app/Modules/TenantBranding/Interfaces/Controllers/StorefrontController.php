<?php

namespace App\Modules\TenantBranding\Interfaces\Controllers;

use App\Modules\TenantBranding\Application\Services\BrandingService;
use App\Modules\TenantBranding\Application\Services\RestaurantStatusService;
use App\Shared\Utils\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;

class StorefrontController extends Controller
{
    public function __construct(private RestaurantStatusService $statusService) {}

    public function show()
    {
        return ApiResponse::success($this->statusService->getStorefront());
    }
}
