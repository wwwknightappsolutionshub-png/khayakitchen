<?php

namespace App\Modules\Pricing\Interfaces\Controllers;

use App\Modules\Pricing\Application\Services\EntitlementOverrideService;
use App\Modules\Pricing\Application\Services\PlanLimitService;
use App\Modules\Pricing\Application\Services\SubscriptionService;
use App\Shared\Utils\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;

class PlatformEntitlementController extends Controller
{
    public function __construct(
        private SubscriptionService $subscriptionService,
        private EntitlementOverrideService $overrideService,
        private PlanLimitService $planLimitService,
    ) {}

    public function show(string $tenantId)
    {
        $data = $this->subscriptionService->getTenantEntitlements($tenantId);
        $data['usage'] = $this->planLimitService->getUsage($tenantId);

        return ApiResponse::success($data);
    }

    public function setFeatureOverride(Request $request, string $tenantId)
    {
        $data = $request->validate([
            'feature_key' => ['required', 'string', 'max:80'],
            'enabled' => ['required', 'boolean'],
            'is_permanent' => ['boolean'],
            'expires_at' => ['nullable', 'date'],
            'reason' => ['nullable', 'string', 'max:500'],
        ]);

        $override = $this->overrideService->setFeatureOverride(
            $tenantId,
            $data['feature_key'],
            $data['enabled'],
            $data['is_permanent'] ?? true,
            $data['expires_at'] ?? null,
            $data['reason'] ?? null,
            $request->user()?->id,
        );

        return ApiResponse::success(['override' => $override]);
    }

    public function setLimitOverride(Request $request, string $tenantId)
    {
        $data = $request->validate([
            'limit_key' => ['required', 'string', 'max:80'],
            'value' => ['nullable', 'integer', 'min:0'],
            'is_unlimited' => ['boolean'],
            'is_permanent' => ['boolean'],
            'expires_at' => ['nullable', 'date'],
            'reason' => ['nullable', 'string', 'max:500'],
        ]);

        $override = $this->overrideService->setLimitOverride(
            $tenantId,
            $data['limit_key'],
            $data['value'] ?? null,
            $data['is_unlimited'] ?? false,
            $data['is_permanent'] ?? true,
            $data['expires_at'] ?? null,
            $data['reason'] ?? null,
            $request->user()?->id,
        );

        return ApiResponse::success(['override' => $override]);
    }

    public function reset(string $tenantId, Request $request)
    {
        $data = $request->validate(['reason' => ['nullable', 'string', 'max:500']]);
        $this->overrideService->resetToPlanDefaults($tenantId, $request->user()?->id, $data['reason'] ?? null);

        return ApiResponse::success(['reset' => true]);
    }
}
