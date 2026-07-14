<?php

namespace App\Modules\TenantBranding\Interfaces\Controllers;

use App\Modules\Engagement\Application\Services\KitchenReviewService;
use App\Modules\RevenueRecovery\Application\Services\RevenueRecoveryCampaignService;
use App\Modules\SeasonalPromo\Application\Services\SeasonalPromoService;
use App\Modules\TenantBranding\Application\Services\RestaurantStatusService;
use App\Modules\Auth\Application\Services\TenantWorkspaceService;
use App\Modules\TenantBranding\Application\Services\TenantPwaManifestService;
use App\Shared\Utils\ApiResponse;
use Illuminate\Routing\Controller;

class StorefrontController extends Controller
{
    public function __construct(
        private RestaurantStatusService $statusService,
        private RevenueRecoveryCampaignService $revenueRecoveryCampaignService,
        private TenantWorkspaceService $workspaceService,
        private TenantPwaManifestService $pwaManifestService,
        private KitchenReviewService $kitchenReviewService,
        private SeasonalPromoService $seasonalPromoService,
    ) {}

    public function show()
    {
        $payload = $this->statusService->getStorefront();
        $payload['revenue_recovery'] = $this->revenueRecoveryCampaignService->getStorefrontPayload();
        $payload['workspace'] = $this->workspaceService->getPublicStorefrontConfig();
        $payload['review_ticker'] = $this->kitchenReviewService->approvedTickerItems();
        $payload['seasonal_promo'] = $this->seasonalPromoService->activePublicSplash();
        $payload['pwa'] = [
            'manifest_path' => '/pwa-manifest/'.$payload['workspace']['slug'],
            'start_url' => $payload['workspace']['ordering_path'],
            'installable' => true,
        ];

        return ApiResponse::success($payload);
    }

    public function pwaManifest(string $slug)
    {
        $manifest = $this->pwaManifestService->buildForSlug($slug);

        return response()->json($manifest, 200, [
            'Content-Type' => 'application/manifest+json',
            'Cache-Control' => 'public, max-age=0, must-revalidate',
        ]);
    }

    public function trackCampaignOpen(string $id)
    {
        $recorded = $this->revenueRecoveryCampaignService->recordNotificationOpen($id);

        return ApiResponse::success(['recorded' => $recorded]);
    }
}
