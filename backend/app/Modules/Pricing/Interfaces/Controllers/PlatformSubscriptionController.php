<?php

namespace App\Modules\Pricing\Interfaces\Controllers;

use App\Modules\Pricing\Application\Services\EntitlementOverrideService;
use App\Modules\Pricing\Application\Services\SubscriptionService;
use App\Shared\Utils\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;

class PlatformSubscriptionController extends Controller
{
    public function __construct(
        private SubscriptionService $subscriptionService,
        private EntitlementOverrideService $overrideService,
    ) {}

    public function index()
    {
        return ApiResponse::success([
            'subscriptions' => $this->subscriptionService->listSubscriptions(),
        ]);
    }

    public function assign(Request $request)
    {
        $data = $request->validate([
            'tenant_id' => ['required', 'uuid'],
            'plan_id' => ['required', 'uuid'],
            'status' => ['nullable', 'in:active,trial,suspended'],
            'billing_status' => ['nullable', 'string', 'max:32'],
            'reason' => ['nullable', 'string', 'max:500'],
        ]);

        $subscription = $this->subscriptionService->assignPlan(
            $data['tenant_id'],
            $data['plan_id'],
            $data['status'] ?? 'active',
            $request->user()?->id,
            $data['reason'] ?? null,
            $data['billing_status'] ?? 'current',
        );

        return ApiResponse::success(['subscription' => $subscription]);
    }

    public function updateStatus(Request $request, string $tenantId)
    {
        $data = $request->validate([
            'status' => ['required', 'in:active,trial,suspended'],
            'billing_status' => ['nullable', 'string', 'max:32'],
            'reason' => ['nullable', 'string', 'max:500'],
        ]);

        $subscription = $this->subscriptionService->updateStatus(
            $tenantId,
            $data['status'],
            $request->user()?->id,
            $data['reason'] ?? null,
            $data['billing_status'] ?? null,
        );

        return ApiResponse::success(['subscription' => $subscription]);
    }

    public function override(Request $request)
    {
        $data = $request->validate([
            'tenant_id' => ['required', 'uuid'],
            'feature_key' => ['required', 'string'],
            'enabled' => ['required', 'boolean'],
            'reason' => ['nullable', 'string', 'max:500'],
        ]);

        $override = $this->overrideService->setFeatureOverride(
            $data['tenant_id'],
            $data['feature_key'],
            $data['enabled'],
            true,
            null,
            $data['reason'] ?? null,
            $request->user()?->id,
        );

        return ApiResponse::success(['override' => $override]);
    }

    public function upgradeRequests(Request $request)
    {
        $status = $request->query('status');

        return ApiResponse::success([
            'requests' => $this->subscriptionService->listUpgradeRequests(is_string($status) ? $status : null),
        ]);
    }
}
