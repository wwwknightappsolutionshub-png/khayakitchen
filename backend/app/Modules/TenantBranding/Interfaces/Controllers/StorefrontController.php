<?php

namespace App\Modules\TenantBranding\Interfaces\Controllers;

use App\Modules\TenantBranding\Application\Services\BrandingService;
use App\Modules\RevenueRecovery\Application\Services\RevenueRecoveryCampaignService;
use App\Modules\TenantBranding\Application\Services\RestaurantStatusService;
use App\Modules\Auth\Application\Services\TenantWorkspaceService;
use App\Shared\Utils\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;

class StorefrontController extends Controller
{
    public function __construct(
        private RestaurantStatusService $statusService,
        private RevenueRecoveryCampaignService $revenueRecoveryCampaignService,
        private TenantWorkspaceService $workspaceService,
    ) {}

    public function show()
    {
        $payload = $this->statusService->getStorefront();
        $payload['revenue_recovery'] = $this->revenueRecoveryCampaignService->getStorefrontPayload();
        $payload['workspace'] = $this->workspaceService->getPublicStorefrontConfig();

        return ApiResponse::success($payload);
    }

    public function trackCampaignOpen(string $id)
    {
        $recorded = $this->revenueRecoveryCampaignService->recordNotificationOpen($id);

        return ApiResponse::success(['recorded' => $recorded]);
    }
}
