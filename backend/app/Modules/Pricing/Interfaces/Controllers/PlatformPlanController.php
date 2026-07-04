<?php

namespace App\Modules\Pricing\Interfaces\Controllers;

use App\Modules\Pricing\Application\Services\PlanService;
use App\Shared\Utils\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;

class PlatformPlanController extends Controller
{
    private const PLAN_RULES = [
        'name' => ['sometimes', 'string', 'max:80'],
        'slug' => ['nullable', 'string', 'max:80'],
        'description' => ['nullable', 'string'],
        'price_monthly' => ['sometimes', 'numeric', 'min:0'],
        'price_yearly' => ['sometimes', 'numeric', 'min:0'],
        'currency' => ['nullable', 'string', 'max:8'],
        'cta_text' => ['nullable', 'string', 'max:120'],
        'plan_color' => ['nullable', 'string', 'max:32'],
        'plan_icon' => ['nullable', 'string', 'max:64'],
        'is_active' => ['boolean'],
        'is_visible' => ['boolean'],
        'is_recommended' => ['boolean'],
        'display_order' => ['integer', 'min:0'],
        'marketing_features' => ['nullable', 'array'],
        'max_menu_items' => ['integer', 'min:0'],
        'max_orders_per_day' => ['integer', 'min:0'],
        'max_customers' => ['integer', 'min:0'],
        'max_categories' => ['integer', 'min:0'],
        'max_staff' => ['integer', 'min:0'],
        'max_campaigns_per_month' => ['integer', 'min:0'],
        'max_push_notifications_per_month' => ['integer', 'min:0'],
        'max_storage_mb' => ['integer', 'min:0'],
        'max_images' => ['integer', 'min:0'],
        'max_branches' => ['integer', 'min:0'],
        'max_drivers' => ['integer', 'min:0'],
        'max_products' => ['integer', 'min:0'],
        'max_loyalty_members' => ['integer', 'min:0'],
        'max_active_promotions' => ['integer', 'min:0'],
        'max_delivery_zones' => ['integer', 'min:0'],
        'unlimited_flags' => ['nullable', 'array'],
    ];

    public function __construct(private PlanService $planService) {}

    public function index()
    {
        return ApiResponse::success(['plans' => $this->planService->listPlans(includeArchived: true)]);
    }

    public function show(string $id)
    {
        return ApiResponse::success(['plan' => $this->planService->getPlan($id)]);
    }

    public function store(Request $request)
    {
        $data = $request->validate(array_merge(self::PLAN_RULES, [
            'name' => ['required', 'string', 'max:80'],
            'price_monthly' => ['required', 'numeric', 'min:0'],
            'price_yearly' => ['required', 'numeric', 'min:0'],
        ]));

        $plan = $this->planService->createPlan($data, $request->user()?->id);

        return ApiResponse::success(['plan' => $plan], 201);
    }

    public function update(Request $request, string $id)
    {
        $data = $request->validate(self::PLAN_RULES);
        $plan = $this->planService->updatePlan($id, $data, $request->user()?->id);

        return ApiResponse::success(['plan' => $plan]);
    }

    public function destroy(Request $request, string $id)
    {
        $this->planService->deletePlan($id, $request->user()?->id);

        return ApiResponse::success(['deleted' => true]);
    }

    public function archive(Request $request, string $id)
    {
        $plan = $this->planService->archivePlan($id, $request->user()?->id);

        return ApiResponse::success(['plan' => $plan]);
    }

    public function restore(Request $request, string $id)
    {
        $plan = $this->planService->restorePlan($id, $request->user()?->id);

        return ApiResponse::success(['plan' => $plan]);
    }

    public function duplicate(Request $request, string $id)
    {
        $plan = $this->planService->duplicatePlan($id, $request->user()?->id);

        return ApiResponse::success(['plan' => $plan], 201);
    }

    public function reorder(Request $request)
    {
        $data = $request->validate(['order' => ['required', 'array'], 'order.*' => ['uuid']]);
        $this->planService->reorderPlans($data['order'], $request->user()?->id);

        return ApiResponse::success(['reordered' => true]);
    }

    public function visibility(Request $request, string $id)
    {
        $data = $request->validate(['is_visible' => ['required', 'boolean']]);
        $plan = $this->planService->setVisibility($id, $data['is_visible'], $request->user()?->id);

        return ApiResponse::success(['plan' => $plan]);
    }

    public function active(Request $request, string $id)
    {
        $data = $request->validate(['is_active' => ['required', 'boolean']]);
        $plan = $this->planService->setActive($id, $data['is_active'], $request->user()?->id);

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
