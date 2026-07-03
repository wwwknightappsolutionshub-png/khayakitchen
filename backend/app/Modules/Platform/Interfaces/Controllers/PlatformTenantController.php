<?php

namespace App\Modules\Platform\Interfaces\Controllers;

use App\Modules\Platform\Application\Services\PlatformTenantService;
use App\Shared\Utils\ApiResponse;
use Illuminate\Routing\Controller;

class PlatformTenantController extends Controller
{
    public function __construct(private PlatformTenantService $tenantService) {}

    public function index()
    {
        return ApiResponse::success(['tenants' => $this->tenantService->listTenants()]);
    }
}
