<?php

namespace App\Modules\Pricing\Interfaces\Controllers;

use App\Modules\Pricing\Application\Services\SubscriptionService;
use App\Shared\Entitlements\FeatureAccessService;
use App\Shared\Utils\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;

class PlatformSubscriptionController extends Controller
{
    public function __construct(
        private SubscriptionService $subscriptionService,
        private FeatureAccessService $featureAccessService,
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
            'reason' => ['nullable', 'string', 'max:500'],
        ]);

        $subscription = $this->subscriptionService->assignPlan(
            $data['tenant_id'],
            $data['plan_id'],
            $data['status'] ?? 'active',
            $request->user()?->id,
            $data['reason'] ?? null,
        );

        return ApiResponse::success(['subscription' => $subscription]);
    }

    public function updateStatus(Request $request, string $tenantId)
    {
        $data = $request->validate([
            'status' => ['required', 'in:active,trial,suspended'],
            'reason' => ['nullable', 'string', 'max:500'],
        ]);

        $subscription = $this->subscriptionService->updateStatus(
            $tenantId,
            $data['status'],
            $request->user()?->id,
            $data['reason'] ?? null,
        );

        return ApiResponse::success(['subscription' => $subscription]);
    }

    public function override(Request $request)
    {
        $data = $request->validate([
            'tenant_id' => ['required', 'uuid'],
            'feature_key' => ['required', 'string'],
            'reason' => ['nullable', 'string', 'max:500'],
        ]);

        $user = $request->user();
        $this->featureAccessService->logSuperAdminOverride(
            $user,
            'entitlement.override',
            $data['tenant_id'],
            ['feature_key' => $data['feature_key']],
            $data['reason'] ?? null,
        );

        return ApiResponse::success(['logged' => true]);
    }
}
