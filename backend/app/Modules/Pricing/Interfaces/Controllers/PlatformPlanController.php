<?php

namespace App\Modules\Pricing\Interfaces\Controllers;

use App\Modules\Pricing\Application\Services\FeatureCatalogService;
use App\Modules\Pricing\Application\Services\PlanService;
use App\Modules\Pricing\Application\Services\SubscriptionService;
use App\Modules\Pricing\Domain\Models\Feature;
use App\Shared\Entitlements\FeatureAccessService;
use App\Shared\Tenancy\TenantContext;
use App\Shared\Utils\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;

class PlatformPlanController extends Controller
{
    public function __construct(private PlanService $planService) {}

    public function index()
    {
        return ApiResponse::success(['plans' => $this->planService->listPlans()]);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:80'],
            'price_monthly' => ['required', 'numeric', 'min:0'],
            'price_yearly' => ['required', 'numeric', 'min:0'],
            'is_active' => ['boolean'],
            'is_visible' => ['boolean'],
            'max_menu_items' => ['integer', 'min:1'],
            'max_orders_per_day' => ['integer', 'min:1'],
            'max_customers' => ['integer', 'min:1'],
        ]);

        $plan = $this->planService->createPlan($data, $request->user()?->id);

        return ApiResponse::success(['plan' => $plan], 201);
    }

    public function update(Request $request, string $id)
    {
        $data = $request->validate([
            'name' => ['sometimes', 'string', 'max:80'],
            'price_monthly' => ['sometimes', 'numeric', 'min:0'],
            'price_yearly' => ['sometimes', 'numeric', 'min:0'],
            'is_active' => ['boolean'],
            'is_visible' => ['boolean'],
            'max_menu_items' => ['integer', 'min:1'],
            'max_orders_per_day' => ['integer', 'min:1'],
            'max_customers' => ['integer', 'min:1'],
        ]);

        $plan = $this->planService->updatePlan($id, $data, $request->user()?->id);

        return ApiResponse::success(['plan' => $plan]);
    }

    public function destroy(Request $request, string $id)
    {
        $this->planService->deletePlan($id, $request->user()?->id);

        return ApiResponse::success(['deleted' => true]);
    }

    public function visibility(Request $request, string $id)
    {
        $data = $request->validate(['is_visible' => ['required', 'boolean']]);
        $plan = $this->planService->setVisibility($id, $data['is_visible'], $request->user()?->id);

        return ApiResponse::success(['plan' => $plan]);
    }

    public function syncFeatures(Request $request, string $id)
    {
        $data = $request->validate([
            'features' => ['required', 'array'],
            'features.*' => ['boolean'],
        ]);

        $plan = $this->planService->syncPlanFeatures($id, $data['features'], $request->user()?->id);

        return ApiResponse::success(['plan' => $plan]);
    }
}
