<?php

namespace App\Modules\Pricing\Interfaces\Controllers;

use App\Modules\Platform\Application\Services\PlatformSettingsService;
use App\Modules\Pricing\Application\Services\PlanService;
use App\Shared\Utils\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;

class PublicPricingController extends Controller
{
    public function __construct(
        private PlanService $planService,
        private PlatformSettingsService $platformSettingsService,
    ) {}

    public function index(Request $request)
    {
        $settings = $this->platformSettingsService->get();
        if (! ($settings->public_pricing_enabled ?? true)) {
            abort(404);
        }

        $plans = $this->planService->listPlans(publicOnly: true);

        return ApiResponse::success([
            'public_pricing_enabled' => true,
            'plans' => $plans->map(fn ($plan) => [
                'id' => $plan->id,
                'name' => $plan->name,
                'slug' => $plan->slug,
                'description' => $plan->description,
                'price_monthly' => (float) $plan->price_monthly,
                'price_yearly' => (float) $plan->price_yearly,
                'currency' => $plan->currency ?? 'GBP',
                'cta_text' => $plan->cta_text,
                'plan_color' => $plan->plan_color,
                'plan_icon' => $plan->plan_icon,
                'is_recommended' => (bool) $plan->is_recommended,
                'marketing_features' => $plan->marketing_features ?? [],
                'limits' => [
                    'max_menu_items' => $plan->max_menu_items,
                    'max_categories' => $plan->max_categories,
                    'max_staff' => $plan->max_staff,
                    'max_campaigns_per_month' => $plan->max_campaigns_per_month,
                    'max_push_notifications_per_month' => $plan->max_push_notifications_per_month,
                    'max_storage_mb' => $plan->max_storage_mb,
                    'max_images' => $plan->max_images,
                    'max_branches' => $plan->max_branches,
                    'max_drivers' => $plan->max_drivers,
                    'max_customers' => $plan->max_customers,
                    'max_products' => $plan->max_products,
                    'max_loyalty_members' => $plan->max_loyalty_members,
                    'max_active_promotions' => $plan->max_active_promotions,
                    'max_delivery_zones' => $plan->max_delivery_zones,
                    'max_orders_per_day' => $plan->max_orders_per_day,
                    'unlimited_flags' => $plan->unlimited_flags ?? [],
                ],
                'features' => $plan->features
                    ->filter(fn ($f) => (bool) $f->pivot->enabled)
                    ->map(fn ($f) => [
                        'key' => $f->key,
                        'name' => $f->name,
                        'category' => $f->category,
                        'icon' => $f->icon,
                    ])
                    ->values(),
            ]),
        ]);
    }
}
