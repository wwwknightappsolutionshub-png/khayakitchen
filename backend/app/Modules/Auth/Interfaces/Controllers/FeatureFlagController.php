<?php

namespace App\Modules\Auth\Interfaces\Controllers;

use App\Shared\FeatureFlags\FeatureFlagService;
use App\Shared\Tenancy\TenantContext;
use App\Shared\Utils\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;

class FeatureFlagController extends Controller
{
    public function __construct(
        private FeatureFlagService $featureFlagService,
        private TenantContext $tenantContext,
    ) {}

    public function index()
    {
        return ApiResponse::success(['flags' => $this->featureFlagService->all()]);
    }

    public function update(Request $request)
    {
        $user = $this->tenantContext->user();
        if ($user?->role !== 'super_admin' && $user?->role !== 'owner') {
            return ApiResponse::error('Unauthorized', 'FORBIDDEN', null, 403);
        }

        $data = $request->validate([
            'flags' => ['required', 'array'],
            'flags.*' => ['boolean'],
        ]);

        $this->featureFlagService->updateFlags($data['flags']);

        return ApiResponse::success(['flags' => $this->featureFlagService->all()]);
    }
}
