<?php

namespace App\Modules\Platform\Interfaces\Controllers;

use App\Modules\Auth\Domain\Models\Tenant;
use App\Modules\Auth\Domain\Models\User;
use App\Modules\Platform\Application\Services\PublicSignupService;
use App\Modules\Platform\Support\PostalCodePolicy;
use App\Shared\Utils\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;

class PublicSignupController extends Controller
{
    public function __construct(private PublicSignupService $signupService) {}

    public function checkSlug(Request $request)
    {
        $data = $request->validate([
            'slug' => ['required', 'string', 'max:100', 'alpha_dash'],
        ]);

        $slug = strtolower(trim($data['slug']));
        $available = ! Tenant::withoutGlobalScopes()->where('slug', $slug)->exists();

        return ApiResponse::success([
            'slug' => $slug,
            'available' => $available,
            'message' => $available
                ? 'Slug is available.'
                : 'This workspace slug is already taken.',
        ]);
    }

    public function checkEmail(Request $request)
    {
        $data = $request->validate([
            'email' => ['required', 'email', 'max:255'],
        ]);

        $email = strtolower(trim($data['email']));
        $available = ! User::withoutGlobalScopes()->where('email', $email)->exists();

        return ApiResponse::success([
            'email' => $email,
            'available' => $available,
            'message' => $available
                ? 'Email is available.'
                : 'An account with this email already exists.',
        ]);
    }

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
            'state' => ['nullable', 'string', 'max:120'],
            'city' => ['required', 'string', 'max:120'],
            'street_address' => ['required', 'string', 'max:255'],
            'postal_code' => [
                PostalCodePolicy::isRequired($request->input('country')) ? 'required' : 'nullable',
                'string',
                'max:32',
            ],
            'timezone' => ['required', 'string', 'max:64'],
            'currency' => ['required', 'string', 'max:8'],
            'owner_name' => ['required', 'string', 'max:255'],
            'owner_email' => ['required', 'email', 'max:255'],
            'owner_phone' => ['required', 'string', 'max:40'],
            'owner_role_title' => ['required', 'string', 'max:120'],
            'owner_password' => ['required', 'string', 'confirmed', Password::min(8)->mixedCase()->numbers()->symbols()],
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
            'logo' => ['nullable', 'file', 'max:2048', 'mimes:jpeg,jpg,png,svg'],
            'terms_accepted' => ['accepted'],
            'marketing_opt_in' => ['nullable', 'boolean'],
            'referral_code' => ['nullable', 'string', 'max:32'],
        ]);

        if ($request->hasFile('logo')) {
            $data['logo'] = $request->file('logo');
        }

        return ApiResponse::success(
            $this->signupService->register($data),
            201,
        );
    }
}
