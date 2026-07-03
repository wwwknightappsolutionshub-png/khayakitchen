<?php

namespace App\Modules\NotificationsCampaign\Interfaces\Controllers;

use App\Modules\NotificationsCampaign\Application\Services\CampaignService;
use App\Modules\NotificationsCampaign\Application\Services\CustomerNotificationPreferenceService;
use App\Shared\Tenancy\TenantContext;
use App\Shared\Utils\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;

class CampaignController extends Controller
{
    public function __construct(
        private CampaignService $campaignService,
        private TenantContext $tenantContext,
    ) {}

    public function index(Request $request)
    {
        if (! $this->campaignService->isEnabledForTenant()) {
            return ApiResponse::error('Campaigns are disabled', 'FEATURE_DISABLED', null, 403);
        }

        return ApiResponse::success([
            'campaigns' => $this->campaignService->listCampaigns($request->get('permissions', [])),
        ]);
    }

    public function store(Request $request)
    {
        if (! $this->campaignService->isEnabledForTenant()) {
            return ApiResponse::error('Campaigns are disabled', 'FEATURE_DISABLED', null, 403);
        }

        $data = $request->validate([
            'title' => ['required', 'string', 'max:120'],
            'message' => ['required', 'string', 'max:1000'],
            'type' => ['required', 'in:promo,announcement,info'],
            'channel' => ['required', 'in:pwa,whatsapp,both'],
            'target_audience' => ['required', 'in:all,repeat_customers,active_customers'],
            'scheduled_at' => ['nullable', 'date'],
        ]);

        $campaign = $this->campaignService->createCampaign($data, $request->get('permissions', []));

        return ApiResponse::success(['campaign' => $campaign], 201);
    }

    public function send(Request $request, string $id)
    {
        if (! $this->campaignService->isEnabledForTenant()) {
            return ApiResponse::error('Campaigns are disabled', 'FEATURE_DISABLED', null, 403);
        }

        $campaign = $this->campaignService->sendCampaign($id, $request->get('permissions', []));

        return ApiResponse::success(['campaign' => $campaign]);
    }
}
