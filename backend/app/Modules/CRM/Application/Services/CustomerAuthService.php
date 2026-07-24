<?php

namespace App\Modules\CRM\Application\Services;

use App\Modules\CRM\Domain\Models\Customer;
use App\Modules\Loyalty\Application\Services\LoyaltyProgramService;
use App\Modules\Loyalty\Application\Services\LoyaltyService;
use App\Modules\Notifications\Infrastructure\WhatsApp\Contracts\WhatsAppProviderInterface;
use App\Modules\Orders\Domain\Models\Order;
use App\Modules\Pricing\Application\Services\AuditLogService;
use App\Modules\Pricing\Application\Services\PlanLimitService;
use App\Modules\RevenueRecovery\Domain\Models\CustomerEmailOtp;
use App\Modules\RevenueRecovery\Domain\Models\CustomerSession;
use App\Modules\RevenueRecovery\Mail\CustomerProximityOtpMail;
use App\Modules\TenantBranding\Application\Services\BrandingService;
use App\Shared\Tenancy\TenantContext;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class CustomerAuthService
{
    private const OTP_TTL_MINUTES = 10;

    private const MAX_OTP_ATTEMPTS = 5;

    private const SESSION_TTL_DAYS = 30;

    public function __construct(
        private TenantContext $tenantContext,
        private BrandingService $brandingService,
        private PlanLimitService $planLimitService,
        private AuditLogService $auditLogService,
        private WhatsAppProviderInterface $whatsAppProvider,
    ) {}

    public function requestOtp(string $phone, ?string $email = null, ?string $name = null, string $mode = 'signin'): array
    {
        $tenantId = $this->tenantContext->id();
        $phone = $this->normalizePhone($phone);
        $email = $email ? strtolower(trim($email)) : null;

        if ($phone === '') {
            throw ValidationException::withMessages(['phone' => ['Enter a valid phone number.']]);
        }

        $customer = Customer::where('phone', $phone)->first();

        if ($mode === 'signup' && ! $customer) {
            $this->planLimitService->assertCustomerLimit($tenantId);
            $customer = Customer::create([
                'tenant_id' => $tenantId,
                'name' => $name ?: 'Guest',
                'phone' => $phone,
                'email' => $email,
            ]);
        }

        if (! $customer) {
            throw ValidationException::withMessages([
                'phone' => ['No account found for this phone. Sign up or place an order first.'],
            ]);
        }

        if ($name && ($customer->name === 'Guest' || $mode === 'signup')) {
            $customer->update(['name' => $name]);
        }

        if ($email && ! $customer->email) {
            $customer->update(['email' => $email]);
            $customer = $customer->fresh();
            app(LoyaltyProgramService::class)->sendInstallWelcomeIfDue($customer);
        }

        $deliveryEmail = $email ?: $customer->email;
        if ($deliveryEmail && ! filter_var($deliveryEmail, FILTER_VALIDATE_EMAIL)) {
            throw ValidationException::withMessages(['email' => ['Enter a valid email address.']]);
        }

        CustomerEmailOtp::where('tenant_id', $tenantId)
            ->where('phone', $phone)
            ->where('purpose', 'account')
            ->delete();

        $otp = (string) random_int(100000, 999999);
        $branding = $this->brandingService->getForTenant($tenantId);
        $restaurant = $branding->restaurant_name ?? 'Our kitchen';
        $channels = [];
        $emailSent = false;
        $whatsappSent = false;

        if ($deliveryEmail) {
            try {
                Mail::to($deliveryEmail)->send(new CustomerProximityOtpMail(
                    $customer->name ?: 'there',
                    $otp,
                    $restaurant,
                ));
                $emailSent = true;
                $channels[] = 'email';
            } catch (\Throwable) {
                // Parallel delivery — WhatsApp may still succeed.
            }
        }

        if ($customer->phone && ! app()->runningUnitTests()) {
            try {
                $this->whatsAppProvider->send(
                    $customer->phone,
                    "Your {$restaurant} login code is {$otp}. It expires in ".self::OTP_TTL_MINUTES.' minutes.',
                    ['type' => 'customer_otp', 'tenant_id' => $tenantId],
                );
                $whatsappSent = true;
                $channels[] = 'whatsapp';
            } catch (\Throwable) {
                // Parallel delivery — email may still succeed.
            }
        } elseif ($customer->phone && app()->runningUnitTests()) {
            $whatsappSent = true;
            $channels[] = 'whatsapp';
        }

        if (! $emailSent && ! $whatsappSent) {
            throw ValidationException::withMessages([
                'phone' => ['Could not send a login code. Add an email on file or try again.'],
            ]);
        }

        $channel = implode('+', $channels);

        CustomerEmailOtp::create([
            'tenant_id' => $tenantId,
            'phone' => $phone,
            'email' => $deliveryEmail ?: '',
            'channel' => $channel,
            'purpose' => 'account',
            'otp_hash' => Hash::make($otp),
            'expires_at' => now()->addMinutes(self::OTP_TTL_MINUTES),
            'attempts' => 0,
            'created_at' => now(),
        ]);

        $this->auditLogService->log(
            'customer.auth.otp_requested',
            $tenantId,
            null,
            'customer',
            $customer->id,
            [
                'channel' => $channel,
                'mode' => $mode,
                'email_sent' => $emailSent,
                'whatsapp_sent' => $whatsappSent,
            ],
        );

        return [
            'sent' => true,
            'channel' => $channel,
            'channels' => $channels,
            'expires_in_seconds' => self::OTP_TTL_MINUTES * 60,
            'customer_id' => $customer->id,
        ];
    }

    public function verifyOtp(string $phone, string $otp, ?string $email = null): array
    {
        $tenantId = $this->tenantContext->id();
        $phone = $this->normalizePhone($phone);
        $otp = trim($otp);

        $query = CustomerEmailOtp::where('tenant_id', $tenantId)
            ->where('phone', $phone)
            ->where('purpose', 'account');

        if ($email) {
            $query->where('email', strtolower(trim($email)));
        }

        $record = $query->orderByDesc('created_at')->first();

        if (! $record || $record->expires_at->isPast()) {
            throw ValidationException::withMessages([
                'otp' => ['This code has expired. Request a new one.'],
            ]);
        }

        if ($record->attempts >= self::MAX_OTP_ATTEMPTS) {
            throw ValidationException::withMessages([
                'otp' => ['Too many attempts. Request a new code.'],
            ]);
        }

        $record->increment('attempts');

        if (! Hash::check($otp, $record->otp_hash)) {
            throw ValidationException::withMessages([
                'otp' => ['Invalid verification code.'],
            ]);
        }

        $customer = Customer::where('phone', $phone)->firstOrFail();

        CustomerEmailOtp::where('tenant_id', $tenantId)
            ->where('phone', $phone)
            ->where('purpose', 'account')
            ->delete();

        $session = $this->issueSession($customer, $customer->email ?: ($record->email ?: ''), 'account');

        $this->auditLogService->log(
            'customer.auth.login',
            $tenantId,
            null,
            'customer',
            $customer->id,
            ['session_id' => $session->id],
        );

        return [
            'session_token' => $session->getAttribute('_plain_token'),
            'expires_at' => $session->expires_at->toIso8601String(),
            'customer' => $this->customerPayload($customer),
        ];
    }

    public function issueSession(Customer $customer, string $email = '', string $purpose = 'account'): CustomerSession
    {
        $tenantId = $this->tenantContext->id();

        CustomerSession::where('tenant_id', $tenantId)
            ->where('customer_id', $customer->id)
            ->where('purpose', $purpose)
            ->delete();

        $plainToken = Str::random(64);

        $session = CustomerSession::create([
            'tenant_id' => $tenantId,
            'customer_id' => $customer->id,
            'phone' => $customer->phone,
            'email' => $email ?: ($customer->email ?: ''),
            'purpose' => $purpose,
            'token_hash' => hash('sha256', $plainToken),
            'location_opt_in' => false,
            'last_seen_at' => now(),
            'expires_at' => now()->addDays(self::SESSION_TTL_DAYS),
        ]);

        $session->setAttribute('_plain_token', $plainToken);

        return $session;
    }

    public function resolveSession(string $plainToken): ?CustomerSession
    {
        $tenantId = $this->tenantContext->id();
        $hash = hash('sha256', $plainToken);

        $session = CustomerSession::where('tenant_id', $tenantId)
            ->where('token_hash', $hash)
            ->where('expires_at', '>', now())
            ->first();

        if (! $session) {
            return null;
        }

        $session->update(['last_seen_at' => now()]);

        return $session->fresh();
    }

    public function logout(CustomerSession $session): void
    {
        $customerId = $session->customer_id;
        $session->delete();

        $this->auditLogService->log(
            'customer.auth.logout',
            $this->tenantContext->id(),
            null,
            'customer',
            $customerId,
            [],
        );
    }

    public function dashboard(CustomerSession $session): array
    {
        $customer = Customer::findOrFail($session->customer_id);
        $loyalty = null;
        $referral = null;

        if (app(\App\Shared\Entitlements\FeatureAccessService::class)->canAccess('loyalty_system', $this->tenantContext->id())) {
            $program = app(LoyaltyProgramService::class);
            $loyalty = $program->customerSnapshot($customer->id, $customer->phone);
            $ref = $program->ensureReferralToken($customer->id);
            $referral = [
                'token' => $ref->token,
                'menu_url' => '/r/'.$this->tenantContext->tenant()?->slug.'?ref='.$ref->token,
                'points_credit' => (int) $program->settings()->referral_points_credit,
                'stamp_credit' => (int) $program->settings()->referral_stamp_credit,
            ];
        }

        $orders = Order::where('customer_id', $customer->id)
            ->orderByDesc('created_at')
            ->limit(10)
            ->get(['id', 'status', 'order_type', 'total_amount', 'discount_total', 'scheduled_time', 'created_at']);

        $addresses = $customer->addresses()->orderByDesc('is_default')->orderBy('created_at')->get();

        return [
            'customer' => $this->customerPayload($customer),
            'loyalty' => $loyalty,
            'referral' => $referral,
            'orders' => $orders,
            'addresses' => $addresses,
            'app_installed' => $customer->app_installed_at !== null,
            'install_claim' => app(LoyaltyProgramService::class)->installClaimEligibilityForCustomer($customer),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function customerPayload(Customer $customer): array
    {
        return [
            'id' => $customer->id,
            'name' => $customer->name,
            'phone' => $customer->phone,
            'email' => $customer->email,
            'app_installed' => $customer->app_installed_at !== null,
            'app_installed_at' => $customer->app_installed_at?->toIso8601String(),
        ];
    }

    public function normalizePhone(string $phone): string
    {
        return preg_replace('/\s+/', '', trim($phone)) ?? '';
    }

    public function requestPhoneChangeOtp(Customer $customer, string $newPhone): array
    {
        $tenantId = $this->tenantContext->id();
        $newPhone = $this->normalizePhone($newPhone);

        CustomerEmailOtp::where('tenant_id', $tenantId)
            ->where('phone', $newPhone)
            ->where('purpose', 'phone_change')
            ->delete();

        $otp = (string) random_int(100000, 999999);
        $deliveryEmail = $customer->email;
        $branding = $this->brandingService->getForTenant($tenantId);
        $restaurant = $branding->restaurant_name ?? 'Our kitchen';
        $channels = [];
        $emailSent = false;
        $whatsappSent = false;

        if ($deliveryEmail) {
            try {
                Mail::to($deliveryEmail)->send(new CustomerProximityOtpMail(
                    $customer->name ?: 'there',
                    $otp,
                    $restaurant,
                ));
                $emailSent = true;
                $channels[] = 'email';
            } catch (\Throwable) {
                // Parallel delivery — WhatsApp may still succeed.
            }
        }

        if (! app()->runningUnitTests()) {
            try {
                $this->whatsAppProvider->send(
                    $customer->phone,
                    "Your {$restaurant} phone-change code is {$otp}.",
                    ['type' => 'phone_change_otp', 'tenant_id' => $tenantId],
                );
                $whatsappSent = true;
                $channels[] = 'whatsapp';
            } catch (\Throwable) {
                // Parallel delivery — email may still succeed.
            }
        } else {
            $whatsappSent = true;
            $channels[] = 'whatsapp';
        }

        if (! $emailSent && ! $whatsappSent) {
            throw ValidationException::withMessages([
                'phone' => ['Could not send a verification code. Try again.'],
            ]);
        }

        $channel = implode('+', $channels);

        CustomerEmailOtp::create([
            'tenant_id' => $tenantId,
            'phone' => $newPhone,
            'email' => $deliveryEmail ?: '',
            'channel' => $channel,
            'purpose' => 'phone_change',
            'otp_hash' => Hash::make($otp),
            'expires_at' => now()->addMinutes(self::OTP_TTL_MINUTES),
            'attempts' => 0,
            'created_at' => now(),
        ]);

        return [
            'sent' => true,
            'channel' => $channel,
            'channels' => $channels,
            'expires_in_seconds' => self::OTP_TTL_MINUTES * 60,
        ];
    }

    public function confirmPhoneChange(Customer $customer, CustomerSession $session, string $newPhone, string $otp): Customer
    {
        $tenantId = $this->tenantContext->id();
        $newPhone = $this->normalizePhone($newPhone);
        $otp = trim($otp);

        $record = CustomerEmailOtp::where('tenant_id', $tenantId)
            ->where('phone', $newPhone)
            ->where('purpose', 'phone_change')
            ->orderByDesc('created_at')
            ->first();

        if (! $record || $record->expires_at->isPast()) {
            throw ValidationException::withMessages(['otp' => ['This code has expired. Request a new one.']]);
        }

        $record->increment('attempts');
        if ($record->attempts > self::MAX_OTP_ATTEMPTS || ! Hash::check($otp, $record->otp_hash)) {
            throw ValidationException::withMessages(['otp' => ['Invalid verification code.']]);
        }

        if (Customer::where('phone', $newPhone)->where('id', '!=', $customer->id)->exists()) {
            throw ValidationException::withMessages([
                'phone' => ['That phone number already belongs to another customer.'],
            ]);
        }

        $customer->update(['phone' => $newPhone]);
        $session->update(['phone' => $newPhone]);

        CustomerEmailOtp::where('tenant_id', $tenantId)
            ->where('purpose', 'phone_change')
            ->where('phone', $newPhone)
            ->delete();

        $this->auditLogService->log(
            'customer.phone_changed',
            $tenantId,
            null,
            'customer',
            $customer->id,
            ['phone' => $newPhone],
        );

        return $customer->fresh();
    }
}
