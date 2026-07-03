<?php

namespace App\Modules\Platform\Interfaces\Controllers;

use App\Modules\Platform\Application\Services\PlatformFeatureFlagService;
use App\Shared\Utils\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;

class PlatformFeatureFlagController extends Controller
{
    public function __construct(private PlatformFeatureFlagService $featureFlagService) {}

    public function index()
    {
        return ApiResponse::success([
            'tenants' => $this->featureFlagService->allTenantsWithFlags(),
        ]);
    }

    public function update(Request $request, string $tenantId)
    {
        $data = $request->validate([
            'flags' => ['required', 'array'],
            'flags.*' => ['boolean'],
        ]);

        $flags = $this->featureFlagService->updateTenantFlags($tenantId, $data['flags']);

        return ApiResponse::success(['flags' => $flags]);
    }
}
