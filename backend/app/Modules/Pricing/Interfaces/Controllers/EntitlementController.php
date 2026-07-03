<?php

namespace App\Modules\Pricing\Interfaces\Controllers;

use App\Shared\Entitlements\FeatureAccessService;
use App\Shared\Tenancy\TenantContext;
use App\Shared\Utils\ApiResponse;
use Illuminate\Routing\Controller;

class EntitlementController extends Controller
{
    public function __construct(
        private FeatureAccessService $featureAccessService,
        private TenantContext $tenantContext,
    ) {}

    public function index()
    {
        $tenantId = $this->tenantContext->id();
        $limits = $this->featureAccessService->getLimits($tenantId);

        return ApiResponse::success([
            'flags' => $this->featureAccessService->legacyFlagsForTenant($tenantId),
            'limits' => $limits?->toArray(),
        ]);
    }
}
