<?php

namespace App\Modules\Pricing\Interfaces\Controllers;

use App\Modules\Pricing\Application\Services\EntitlementOverrideService;
use App\Modules\Pricing\Application\Services\PlanLimitService;
use App\Modules\Pricing\Application\Services\SubscriptionService;
use App\Shared\Utils\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;

class EntitlementController extends Controller
{
    public function __construct(
        private \App\Shared\Entitlements\FeatureAccessService $featureAccessService,
        private \App\Shared\Tenancy\TenantContext $tenantContext,
        private PlanLimitService $planLimitService,
        private SubscriptionService $subscriptionService,
    ) {}

    public function index()
    {
        $tenantId = $this->tenantContext->id();
        $limits = $this->featureAccessService->getLimits($tenantId);
        $summary = $this->featureAccessService->getSubscriptionSummary($tenantId);

        return ApiResponse::success([
            'flags' => $this->featureAccessService->legacyFlagsForTenant($tenantId),
            'limits' => $limits?->toArray(),
            'unlimited' => $limits?->unlimitedToArray(),
            'usage' => $this->planLimitService->getUsage($tenantId),
            'plan' => $summary['plan'] ?? null,
            'subscription' => $summary['subscription'] ?? null,
        ]);
    }

    public function requestUpgrade(Request $request)
    {
        $data = $request->validate([
            'requested_plan_id' => ['nullable', 'uuid'],
            'message' => ['nullable', 'string', 'max:1000'],
        ]);

        $tenantId = $this->tenantContext->id();
        $upgrade = $this->subscriptionService->createUpgradeRequest(
            $tenantId,
            $data['requested_plan_id'] ?? null,
            $data['message'] ?? null,
            $request->user()?->id,
        );

        return ApiResponse::success(['request' => $upgrade], 201);
    }
}
