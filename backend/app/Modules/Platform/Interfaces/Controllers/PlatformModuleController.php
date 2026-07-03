<?php

namespace App\Modules\Platform\Interfaces\Controllers;

use App\Modules\Platform\Application\Services\ModuleRegistryService;
use App\Shared\Utils\ApiResponse;
use Illuminate\Routing\Controller;

class PlatformModuleController extends Controller
{
    public function __construct(private ModuleRegistryService $registryService) {}

    public function index()
    {
        return ApiResponse::success(['modules' => $this->registryService->all()]);
    }
}
