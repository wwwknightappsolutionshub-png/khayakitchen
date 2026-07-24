<?php

namespace App\Modules\TenantBranding\Interfaces\Controllers;

use App\Modules\Engagement\Application\Services\KitchenReviewService;
use App\Modules\Menu\Domain\Models\Meal;
use App\Modules\RevenueRecovery\Application\Services\RevenueRecoveryCampaignService;
use App\Modules\SeasonalPromo\Application\Services\SeasonalPromoService;
use App\Modules\TenantBranding\Application\Services\BrandingService;
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
        private BrandingService $brandingService,
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

    public function mealShare(string $mealId)
    {
        $meal = Meal::findOrFail($mealId);
        $workspace = $this->workspaceService->getPublicStorefrontConfig();
        $branding = $this->brandingService->getForTenant();
        $restaurantName = $branding->restaurant_name ?: ($workspace['name'] ?? 'Kitchen');
        $frontend = rtrim((string) config('app.frontend_url', 'http://localhost:3000'), '/');
        $shareUrl = $frontend.'/r/'.$workspace['slug'].'/meal/'.$meal->id;

        return ApiResponse::success([
            'meal' => [
                'id' => $meal->id,
                'name' => $meal->name,
                'description' => $meal->description,
                'price' => (float) $meal->base_price,
                'image_url' => $meal->image_url,
            ],
            'restaurant_name' => $restaurantName,
            'share_url' => $shareUrl,
            'og_title' => $restaurantName,
            'og_description' => 'Try '.$meal->name.' from '.$restaurantName.'. I think you will really love it.',
            'og_image' => $meal->image_url,
        ]);
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
