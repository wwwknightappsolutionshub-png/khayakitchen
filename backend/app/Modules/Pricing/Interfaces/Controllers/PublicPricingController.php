<?php

namespace App\Modules\Pricing\Interfaces\Controllers;

use App\Modules\Pricing\Application\Services\PlanService;
use App\Shared\Utils\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;

class PublicPricingController extends Controller
{
    public function __construct(private PlanService $planService) {}

    public function index()
    {
        $demoMode = (bool) config('pricing.demo_mode', false);
        $plans = $this->planService->listPlans($demoMode);

        return ApiResponse::success([
            'demo_mode' => $demoMode,
            'plans' => $plans->map(fn ($plan) => [
                'id' => $plan->id,
                'name' => $plan->name,
                'price_monthly' => (float) $plan->price_monthly,
                'price_yearly' => (float) $plan->price_yearly,
                'max_menu_items' => $plan->max_menu_items,
                'max_orders_per_day' => $plan->max_orders_per_day,
                'max_customers' => $plan->max_customers,
                'features' => $plan->features
                    ->filter(fn ($f) => (bool) $f->pivot->enabled)
                    ->map(fn ($f) => [
                        'key' => $f->key,
                        'name' => $f->name,
                        'category' => $f->category,
                    ])
                    ->values(),
            ]),
        ]);
    }
}
