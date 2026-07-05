<?php

namespace App\Modules\Platform\Interfaces\Controllers;

use App\Modules\Platform\Application\Services\PublicSignupService;
use App\Shared\Utils\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Validation\Rule;

class PublicSignupController extends Controller
{
    public function __construct(private PublicSignupService $signupService) {}

    public function store(Request $request)
    {
        $data = $request->validate([
            'restaurant_name' => ['required', 'string', 'max:255'],
            'legal_business_name' => ['required', 'string', 'max:255'],
            'business_type' => ['required', 'in:restaurant,cafe,cloud_kitchen,catering,franchise,other'],
            'company_registration_number' => ['nullable', 'string', 'max:120'],
            'tax_vat_number' => ['nullable', 'string', 'max:120'],
            'slug' => ['required', 'string', 'max:100', 'alpha_dash', Rule::unique('tenants', 'slug')],
            'country' => ['required', 'string', 'max:120'],
            'city' => ['required', 'string', 'max:120'],
            'street_address' => ['required', 'string', 'max:255'],
            'postal_code' => ['required', 'string', 'max:32'],
            'timezone' => ['required', 'string', 'max:64'],
            'currency' => ['required', 'string', 'max:8'],
            'owner_name' => ['required', 'string', 'max:255'],
            'owner_email' => ['required', 'email', 'max:255'],
            'owner_phone' => ['required', 'string', 'max:40'],
            'owner_role_title' => ['required', 'string', 'max:120'],
            'owner_password' => ['required', 'string', 'min:8', 'confirmed'],
            'plan_id' => ['required', 'uuid'],
            'order_types' => ['required', 'array', 'min:1'],
            'order_types.*' => ['in:pickup,delivery'],
            'estimated_daily_orders' => ['required', 'integer', 'min:1', 'max:100000'],
            'staff_count' => ['required', 'integer', 'min:1', 'max:10000'],
            'branch_count' => ['required', 'integer', 'min:1', 'max:1000'],
            'average_order_value' => ['nullable', 'numeric', 'min:0'],
            'tagline' => ['nullable', 'string', 'max:160'],
            'primary_color' => ['nullable', 'string', 'max:20'],
            'secondary_color' => ['nullable', 'string', 'max:20'],
            'logo_url' => ['nullable', 'url', 'max:500'],
            'terms_accepted' => ['accepted'],
            'marketing_opt_in' => ['nullable', 'boolean'],
        ]);

        return ApiResponse::success(
            $this->signupService->register($data),
            201,
        );
    }
}
