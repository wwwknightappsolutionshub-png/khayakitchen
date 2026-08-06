<?php

namespace App\Modules\Platform\Application\Services;

use App\Modules\Auth\Application\Services\EmailVerificationService;
use App\Modules\Auth\Domain\Models\Tenant;
use App\Modules\Auth\Domain\Models\User;
use App\Modules\Notifications\Infrastructure\WhatsApp\Contracts\WhatsAppProviderInterface;
use App\Modules\Pricing\Application\Services\AuditLogService;
use App\Modules\Pricing\Application\Services\SubscriptionService;
use App\Modules\Pricing\Application\Services\TenantReferralService;
use App\Modules\Pricing\Domain\Models\Plan;
use App\Modules\TenantBranding\Domain\Models\TenantBranding;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;
use Throwable;

class PublicSignupService
{
    public function __construct(
        private PlatformTenantService $tenantService,
        private SubscriptionService $subscriptionService,
        private AuditLogService $auditLogService,
        private EmailVerificationService $emailVerificationService,
        private TenantReferralService $referralService,
        private WhatsAppProviderInterface $whatsAppProvider,
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

        $result = DB::transaction(function () use ($data, $plan, $plainPassword, $signupMetadata) {
            $logoUrl = $this->resolveLogoUrl($data);

            $tenant = $this->tenantService->createTenant([
                'name' => $data['restaurant_name'],
                'slug' => $data['slug'],
                'logo_url' => $logoUrl,
                'primary_color' => $data['primary_color'] ?? '#1a1a2e',
                'owner_name' => $data['owner_name'],
                'owner_email' => $data['owner_email'],
                'owner_password' => $plainPassword,
                'owner_email_verified_at' => null,
            ]);

            Tenant::withoutGlobalScopes()
                ->where('id', $tenant['id'])
                ->update([
                    'signup_metadata' => $signupMetadata,
                    'currency' => strtoupper((string) ($data['currency'] ?? 'GBP')),
                    'country' => $data['country'] ?? null,
                    'country_iso' => isset($data['country_iso']) ? strtoupper((string) $data['country_iso']) : null,
                    'timezone' => $data['timezone'] ?? null,
                    'ui_theme' => 'light',
                    'logo_url' => $logoUrl,
                ]);

            // Persist uploaded logo under the real tenant id (createTenant may run before id exists).
            if (($data['logo'] ?? null) instanceof UploadedFile) {
                $logoUrl = $this->storeSignupLogo($data['logo'], $tenant['id']);
                Tenant::withoutGlobalScopes()->where('id', $tenant['id'])->update(['logo_url' => $logoUrl]);
            }

            TenantBranding::withoutGlobalScopes()
                ->where('tenant_id', $tenant['id'])
                ->update([
                    'restaurant_name' => $data['restaurant_name'],
                    'primary_color' => $data['primary_color'] ?? '#1a1a2e',
                    'secondary_color' => $data['secondary_color'] ?? '#e94560',
                    'logo_url' => $logoUrl,
                ]);

            // Referral trial/reward applied after create via TenantReferralService (valid codes only).
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
                    'email_verified' => false,
                    'referral_code' => $data['referral_code'] ?? null,
                    'has_logo' => filled($logoUrl),
                ],
            );

            $owner = User::withoutGlobalScopes()
                ->where('tenant_id', $tenant['id'])
                ->where('email', $data['owner_email'])
                ->firstOrFail();

            return [
                'tenant' => array_merge($tenant, [
                    'name' => $data['restaurant_name'],
                    'logo_url' => $logoUrl,
                ]),
                'plan' => [
                    'id' => $plan->id,
                    'name' => $plan->name,
                    'slug' => $plan->slug,
                ],
                'owner_email' => $data['owner_email'],
                'owner_id' => $owner->id,
                'message' => 'Check your email to confirm your account before signing in.',
            ];
        });

        try {
            $this->referralService->completeSignupAttribution($result['tenant']['id'], $data);
        } catch (\Throwable $e) {
            report($e);
        }

        $owner = User::withoutGlobalScopes()->findOrFail($result['owner_id']);
        $this->emailVerificationService->createAndSendVerification($owner, $data['slug']);
        $this->sendWelcomeWhatsApp($result, $data, $plan->name);

        unset($result['owner_id']);

        return $result;
    }

    /**
     * @param  array<string, mixed>  $result
     * @param  array<string, mixed>  $data
     */
    private function sendWelcomeWhatsApp(array $result, array $data, string $planName): void
    {
        $ownerPhone = preg_replace('/\s+/', '', trim((string) ($data['owner_phone'] ?? ''))) ?? '';
        if ($ownerPhone === '') {
            return;
        }

        $tenantId = (string) ($result['tenant']['id'] ?? '');
        $tenantSlug = (string) ($result['tenant']['slug'] ?? ($data['slug'] ?? ''));
        $ownerEmail = (string) ($result['owner_email'] ?? ($data['owner_email'] ?? ''));
        $ownerName = (string) ($data['owner_name'] ?? 'Owner');
        $restaurant = (string) ($data['restaurant_name'] ?? ($result['tenant']['name'] ?? 'your kitchen'));

        $loginUrl = rtrim((string) config('app.frontend_url', env('FRONTEND_URL', 'http://localhost:3000')), '/').'/ops/login?'.http_build_query([
            'email' => $ownerEmail,
            'tenant' => $tenantSlug,
            'welcome' => '1',
        ]);

        $message = "Congratulations {$ownerName}! Welcome to KhayaOS. ".
            "Your workspace {$restaurant} is now onboarded on the {$planName} plan. ".
            "Confirm your email, then sign in here: {$loginUrl}";

        try {
            $this->whatsAppProvider->send($ownerPhone, $message, [
                'type' => 'owner_welcome',
                'tenant_id' => $tenantId,
                'owner_email' => $ownerEmail,
            ]);
        } catch (Throwable $e) {
            Log::warning('Signup welcome WhatsApp failed', [
                'tenant_id' => $tenantId,
                'phone' => $ownerPhone,
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
            'state' => $data['state'] ?? null,
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
            'referral_code' => isset($data['referral_code']) ? strtoupper(trim((string) $data['referral_code'])) : null,
            'submitted_at' => now()->toIso8601String(),
        ];
    }

    /**
     * @param  array<string, mixed>  $data
     */
    private function resolveLogoUrl(array $data): ?string
    {
        if (! empty($data['logo_url'])) {
            return (string) $data['logo_url'];
        }

        return null;
    }

    private function storeSignupLogo(UploadedFile $file, string $tenantId): string
    {
        $path = $file->store("branding/{$tenantId}", 'public');

        return Storage::disk('public')->url($path);
    }
}
