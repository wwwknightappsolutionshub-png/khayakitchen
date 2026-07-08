<?php

namespace App\Modules\Platform\Application\Services;

use App\Modules\Auth\Domain\Models\Tenant;
use App\Modules\Auth\Domain\Models\User;
use App\Modules\Platform\Mail\WelcomeOwnerMail;
use App\Modules\Pricing\Application\Services\AuditLogService;
use App\Modules\Pricing\Application\Services\SubscriptionService;
use App\Modules\Pricing\Domain\Models\Plan;
use App\Modules\TenantBranding\Domain\Models\TenantBranding;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Validation\ValidationException;
use Throwable;

class PublicSignupService
{
    public function __construct(
        private PlatformTenantService $tenantService,
        private SubscriptionService $subscriptionService,
        private AuditLogService $auditLogService,
    ) {}

    /**
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    public function register(array $data): array
    {
        $plan = Plan::where('id', $data['plan_id'])
            ->where('is_active', true)
            ->where('is_visible', true)
            ->first();

        if (! $plan) {
            throw ValidationException::withMessages(['plan_id' => ['Selected plan is not available.']]);
        }

        if (User::withoutGlobalScopes()->where('email', $data['owner_email'])->exists()) {
            throw ValidationException::withMessages(['owner_email' => ['An account with this email already exists.']]);
        }

        $plainPassword = $data['owner_password'];
        $signupMetadata = $this->buildSignupMetadata($data);
        $loginUrl = rtrim((string) config('app.frontend_url', env('FRONTEND_URL', 'http://localhost:3000')), '/').'/login';

        $result = DB::transaction(function () use ($data, $plan, $plainPassword, $signupMetadata, $loginUrl) {
            $tenant = $this->tenantService->createTenant([
                'name' => $data['restaurant_name'],
                'slug' => $data['slug'],
                'logo_url' => $data['logo_url'] ?? null,
                'primary_color' => $data['primary_color'] ?? '#1a1a2e',
                'owner_name' => $data['owner_name'],
                'owner_email' => $data['owner_email'],
                'owner_password' => $plainPassword,
            ]);

            Tenant::withoutGlobalScopes()
                ->where('id', $tenant['id'])
                ->update(['signup_metadata' => $signupMetadata]);

            TenantBranding::withoutGlobalScopes()
                ->where('tenant_id', $tenant['id'])
                ->update([
                    'restaurant_name' => $data['restaurant_name'],
                    'primary_color' => $data['primary_color'] ?? '#1a1a2e',
                    'secondary_color' => $data['secondary_color'] ?? '#e94560',
                    'logo_url' => $data['logo_url'] ?? null,
                ]);

            $this->subscriptionService->assignPlan(
                $tenant['id'],
                $plan->id,
                'active',
                null,
                'Public self-service signup',
            );

            $this->auditLogService->log(
                'signup.completed',
                $tenant['id'],
                null,
                'tenant',
                $tenant['id'],
                [
                    'plan_id' => $plan->id,
                    'plan_name' => $plan->name,
                    'owner_email' => $data['owner_email'],
                    'business_type' => $data['business_type'] ?? null,
                ],
            );

            return [
                'tenant' => $tenant,
                'plan' => [
                    'id' => $plan->id,
                    'name' => $plan->name,
                    'slug' => $plan->slug,
                ],
                'owner_email' => $data['owner_email'],
                'login_url' => $loginUrl,
                'message' => 'Congratulations and welcome to KhayaOS',
            ];
        });

        // Send the welcome email AFTER the tenant is fully committed. A mail
        // transport failure (misconfigured SMTP on the server) must never roll
        // back a successful signup — the owner already set their own password.
        $this->sendWelcomeEmail($data, $plan, $plainPassword, $loginUrl);

        return $result;
    }

    /**
     * @param  array<string, mixed>  $data
     */
    private function sendWelcomeEmail(array $data, Plan $plan, string $plainPassword, string $loginUrl): void
    {
        try {
            Mail::to($data['owner_email'])->send(new WelcomeOwnerMail(
                ownerName: $data['owner_name'],
                restaurantName: $data['restaurant_name'],
                tenantSlug: $data['slug'],
                ownerEmail: $data['owner_email'],
                plainPassword: $plainPassword,
                loginUrl: $loginUrl,
                planName: $plan->name,
            ));
        } catch (Throwable $e) {
            Log::error('Signup welcome email failed to send', [
                'owner_email' => $data['owner_email'],
                'tenant_slug' => $data['slug'],
                'error' => $e->getMessage(),
            ]);
        }
    }

    /**
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    private function buildSignupMetadata(array $data): array
    {
        return [
            'legal_business_name' => $data['legal_business_name'] ?? null,
            'business_type' => $data['business_type'] ?? null,
            'company_registration_number' => $data['company_registration_number'] ?? null,
            'tax_vat_number' => $data['tax_vat_number'] ?? null,
            'country' => $data['country'] ?? null,
            'city' => $data['city'] ?? null,
            'street_address' => $data['street_address'] ?? null,
            'postal_code' => $data['postal_code'] ?? null,
            'timezone' => $data['timezone'] ?? null,
            'currency' => $data['currency'] ?? null,
            'owner_phone' => $data['owner_phone'] ?? null,
            'owner_role_title' => $data['owner_role_title'] ?? null,
            'order_types' => $data['order_types'] ?? [],
            'estimated_daily_orders' => $data['estimated_daily_orders'] ?? null,
            'staff_count' => $data['staff_count'] ?? null,
            'branch_count' => $data['branch_count'] ?? null,
            'average_order_value' => $data['average_order_value'] ?? null,
            'tagline' => $data['tagline'] ?? null,
            'marketing_opt_in' => (bool) ($data['marketing_opt_in'] ?? false),
            'submitted_at' => now()->toIso8601String(),
        ];
    }
}
