<?php

namespace App\Modules\Platform\Application\Services;

use App\Modules\Auth\Application\Services\EmailVerificationService;
use App\Modules\Auth\Domain\Models\Tenant;
use App\Modules\Auth\Domain\Models\User;
use App\Modules\Notifications\Application\Services\PlatformWhatsAppWelcomeImageService;
use App\Modules\Notifications\Application\Services\WhatsAppCredentialResolver;
use App\Modules\Notifications\Infrastructure\WhatsApp\Contracts\WhatsAppProviderInterface;
use App\Modules\Notifications\Jobs\SendSignupWelcomeWhatsAppJob;
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

        if (User::withoutGlobalScopes()->whereRaw('LOWER(email) = ?', [strtolower((string) $data['owner_email'])])->exists()) {
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
            // Soft-fail: a storage permission/disk error must not abort tenant provisioning.
            if (($data['logo'] ?? null) instanceof UploadedFile) {
                try {
                    $logoUrl = $this->storeSignupLogo($data['logo'], $tenant['id']);
                    Tenant::withoutGlobalScopes()->where('id', $tenant['id'])->update(['logo_url' => $logoUrl]);
                } catch (Throwable $e) {
                    Log::error('Signup logo upload failed — continuing without logo', [
                        'tenant_id' => $tenant['id'],
                        'error' => $e->getMessage(),
                    ]);
                    report($e);
                }
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

        $ownerId = (string) $result['owner_id'];
        $tenantSlug = (string) ($data['slug'] ?? $result['tenant']['slug'] ?? '');
        $planName = $plan->name;
        // Slim queue payload: only fields needed for welcome WhatsApp (never passwords/logo).
        $signupData = [
            'owner_phone' => $data['owner_phone'] ?? null,
            'owner_name' => $data['owner_name'] ?? null,
            'owner_email' => $data['owner_email'] ?? null,
            'restaurant_name' => $data['restaurant_name'] ?? null,
            'slug' => $data['slug'] ?? null,
        ];

        // Prepare the HTTP payload before side-effects so a notification failure cannot
        // leave the client with Server Error after the tenant already exists.
        $responsePayload = $result;
        unset($responsePayload['owner_id']);

        /*
         * Verification email stays in-request (usually fast; Mail::fake in tests).
         * Welcome WhatsApp is queued — never block/timeout the signup HTTP response after
         * the tenant row is already committed (that produced false "Server Error" UX).
         */
        try {
            $owner = User::withoutGlobalScopes()->find($ownerId);
            if ($owner) {
                $this->emailVerificationService->createAndSendVerification($owner, $tenantSlug);
            } else {
                Log::error('Signup verification skipped — owner not found', ['owner_id' => $ownerId]);
            }
        } catch (Throwable $e) {
            Log::error('Signup verification email failed', [
                'owner_id' => $ownerId,
                'error' => $e->getMessage(),
            ]);
            report($e);
        }

        try {
            SendSignupWelcomeWhatsAppJob::dispatch(
                $ownerId,
                $tenantSlug,
                [
                    'tenant' => [
                        'id' => $result['tenant']['id'] ?? null,
                        'slug' => $result['tenant']['slug'] ?? $tenantSlug,
                        'name' => $result['tenant']['name'] ?? ($data['restaurant_name'] ?? null),
                    ],
                    'owner_email' => $result['owner_email'] ?? ($data['owner_email'] ?? null),
                ],
                $signupData,
                $planName,
            );
        } catch (Throwable $e) {
            Log::error('Signup welcome WhatsApp job dispatch failed (signup still succeeded)', [
                'owner_id' => $ownerId,
                'error' => $e->getMessage(),
            ]);
            report($e);
        }

        return $responsePayload;
    }

    /**
     * Welcome WhatsApp for a successful registration (not gated on email verification).
     *
     * @param  array<string, mixed>  $result
     * @param  array<string, mixed>  $data
     */
    public function deliverPostSignupNotifications(
        string $ownerId,
        string $tenantSlug,
        array $result,
        array $data,
        string $planName,
    ): void {
        Log::info('Signup WhatsApp notification starting', [
            'owner_id' => $ownerId,
            'tenant_slug' => $tenantSlug,
        ]);

        try {
            $this->sendWelcomeWhatsApp($result, $data, $planName);
        } catch (Throwable $e) {
            Log::warning('Signup welcome WhatsApp dispatch failed', [
                'owner_id' => $ownerId,
                'error' => $e->getMessage(),
            ]);
            report($e);
            // Rethrow so SendSignupWelcomeWhatsAppJob retries (Genius soft-fails used to mark DONE).
            throw $e;
        }
    }

    /**
     * @param  array<string, mixed>  $result
     * @param  array<string, mixed>  $data
     */
    private function sendWelcomeWhatsApp(array $result, array $data, string $planName): void
    {
        $ownerPhone = preg_replace('/\s+/', '', trim((string) ($data['owner_phone'] ?? ''))) ?? '';
        if ($ownerPhone === '') {
            Log::warning('Signup WhatsApp skipped — owner phone missing', [
                'tenant_id' => $result['tenant']['id'] ?? null,
            ]);

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

        // WhatsApp cannot render HTML email layouts. Use WhatsApp text formatting
        // (*bold*, newlines) so the welcome mirrors WelcomeOwnerMail content hierarchy.
        $message = "*Welcome aboard, {$ownerName}*\n\n".
            "Your restaurant workspace *{$restaurant}* is live on KhayaOS.\n".
            "You are on the *{$planName}* plan and ready to configure your menu, accept orders, and grow revenue.\n\n".
            "*Your workspace*\n".
            "Login URL: {$loginUrl}\n".
            "Workspace slug: {$tenantSlug}\n".
            "Email: {$ownerEmail}\n\n".
            "Confirm your email, then sign in with the password you chose during registration.\n\n".
            "Open admin dashboard:\n{$loginUrl}";

        // New kitchens have no tenant WhatsApp yet — always use platform sender.
        $resolver = app(WhatsAppCredentialResolver::class);
        if (! $resolver->hasSendableCredentials(null)) {
            Log::error('Signup WhatsApp skipped — platform WhatsApp credentials incomplete', [
                'tenant_id' => $tenantId,
                'phone' => $ownerPhone,
            ]);

            throw new \RuntimeException(
                'Platform WhatsApp credentials incomplete — cannot send signup welcome.',
            );
        }

        $welcomeImage = app(PlatformWhatsAppWelcomeImageService::class);
        $mediaUrl = $welcomeImage->resolvePublicUrl();

        // Preserve the working text delivery path: always send type=text (no media).
        // Banner is a separate soft-fail image send so a Genius media mismatch cannot
        // block or alter the welcome copy that already works in production.
        if (filled($mediaUrl)) {
            try {
                $this->whatsAppProvider->send($ownerPhone, 'KhayaOS', [
                    'type' => 'owner_welcome_image',
                    'tenant_id' => null,
                    'signup_tenant_id' => $tenantId,
                    'media_url' => $mediaUrl,
                ]);
                Log::info('Signup WhatsApp welcome image sent', [
                    'tenant_id' => $tenantId,
                    'phone' => $ownerPhone,
                    'media_url' => $mediaUrl,
                ]);
            } catch (Throwable $e) {
                Log::warning('Signup WhatsApp welcome image failed (text welcome still sending)', [
                    'tenant_id' => $tenantId,
                    'phone' => $ownerPhone,
                    'media_url' => $mediaUrl,
                    'error' => $e->getMessage(),
                ]);
            }
        } else {
            Log::warning('Signup WhatsApp welcome image skipped — no public media URL', [
                'tenant_id' => $tenantId,
            ]);
        }

        $this->whatsAppProvider->send($ownerPhone, $message, [
            'type' => 'owner_welcome',
            'tenant_id' => null,
            'signup_tenant_id' => $tenantId,
            'owner_email' => $ownerEmail,
        ]);
        Log::info('Signup WhatsApp send completed', [
            'tenant_id' => $tenantId,
            'phone' => $ownerPhone,
            'has_media_url' => filled($mediaUrl),
        ]);
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
            // Optional launch field — metadata only. Never write to tenant_brandings (no column).
            'tagline' => filled($data['tagline'] ?? null) ? trim((string) $data['tagline']) : null,
            'primary_color' => $data['primary_color'] ?? null,
            'secondary_color' => $data['secondary_color'] ?? null,
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
