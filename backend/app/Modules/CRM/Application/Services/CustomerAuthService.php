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
use Illuminate\Support\Facades\Log;
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

        if ($mode === 'signup') {
            if (! $email) {
                throw ValidationException::withMessages([
                    'email' => ['Enter your email so we can send your verification code.'],
                ]);
            }

            if ($customer) {
                throw ValidationException::withMessages([
                    'phone' => ['An account already exists with this phone number. Sign in instead.'],
                ]);
            }

            $emailTaken = Customer::whereRaw('LOWER(email) = ?', [$email])->exists();
            if ($emailTaken) {
                throw ValidationException::withMessages([
                    'email' => ['An account already exists with this email address. Sign in instead.'],
                ]);
            }

            $this->planLimitService->assertCustomerLimit($tenantId);
            $customer = Customer::create([
                'tenant_id' => $tenantId,
                'name' => $name ?: 'Guest',
                'phone' => $phone,
                'email' => $email,
            ]);
            app(\App\Modules\NotificationsCampaign\Application\Services\CustomerNotificationPreferenceService::class)
                ->ensureDefaultOptIns($tenantId, $customer);
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
        $delivered = $this->deliverOtpToEmailAndWhatsApp(
            $customer,
            $otp,
            $restaurant,
            $deliveryEmail,
            $tenantId,
            'verification',
            'customer_otp',
            "Your {$restaurant} verification code is {$otp}. It expires in ".self::OTP_TTL_MINUTES.' minutes.',
        );
        $channels = $delivered['channels'];
        $emailSent = $delivered['email_sent'];
        $whatsappSent = $delivered['whatsapp_sent'];
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
            'email_sent' => $emailSent,
            'whatsapp_sent' => $whatsappSent,
            'expires_in_seconds' => self::OTP_TTL_MINUTES * 60,
            'customer_id' => $customer->id,
        ];
    }

    public function verifyOtp(string $phone, string $otp, ?string $email = null, ?string $password = null): array
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

        if ($password !== null && $password !== '') {
            $this->assertPasswordStrength($password);
            $customer->password = $password;
            $customer->save();
        }

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
            ['session_id' => $session->id, 'via' => 'otp'],
        );

        return [
            'session_token' => $session->getAttribute('_plain_token'),
            'expires_at' => $session->expires_at->toIso8601String(),
            'customer' => $this->customerPayload($customer->fresh()),
        ];
    }

    /**
     * @return array{session_token: string, expires_at: string, customer: array<string, mixed>}
     */
    public function loginWithPassword(string $phone, string $password): array
    {
        $tenantId = $this->tenantContext->id();
        $phone = $this->normalizePhone($phone);
        $customer = Customer::where('phone', $phone)->first();

        if (! $customer || ! $customer->password) {
            throw ValidationException::withMessages([
                'password' => ['Invalid phone or password. Use a one-time code if you have not set a password yet.'],
            ]);
        }

        if (! Hash::check($password, $customer->password)) {
            throw ValidationException::withMessages([
                'password' => ['Invalid phone or password.'],
            ]);
        }

        $session = $this->issueSession($customer, $customer->email ?: '', 'account');

        $this->auditLogService->log(
            'customer.auth.password_login',
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

    /**
     * @return array{sent: bool, channel: string, channels: list<string>, expires_in_seconds: int}
     */
    public function forgotPassword(string $phone, ?string $email = null): array
    {
        $tenantId = $this->tenantContext->id();
        $phone = $this->normalizePhone($phone);
        $email = $email ? strtolower(trim($email)) : null;

        $customer = Customer::where('phone', $phone)->first();
        if (! $customer) {
            throw ValidationException::withMessages([
                'phone' => ['No account found for this phone.'],
            ]);
        }

        $deliveryEmail = $email ?: $customer->email;
        if ($deliveryEmail && ! filter_var($deliveryEmail, FILTER_VALIDATE_EMAIL)) {
            throw ValidationException::withMessages(['email' => ['Enter a valid email address.']]);
        }

        CustomerEmailOtp::where('tenant_id', $tenantId)
            ->where('phone', $phone)
            ->where('purpose', 'password_reset')
            ->delete();

        $otp = (string) random_int(100000, 999999);
        $branding = $this->brandingService->getForTenant($tenantId);
        $restaurant = $branding->restaurant_name ?? 'Our kitchen';
        $delivered = $this->deliverOtpToEmailAndWhatsApp(
            $customer,
            $otp,
            $restaurant,
            $deliveryEmail,
            $tenantId,
            'password reset',
            'customer_password_reset',
            "Your {$restaurant} password reset code is {$otp}. It expires in ".self::OTP_TTL_MINUTES.' minutes.',
        );
        $channels = $delivered['channels'];
        $emailSent = $delivered['email_sent'];
        $whatsappSent = $delivered['whatsapp_sent'];
        $channel = implode('+', $channels);

        CustomerEmailOtp::create([
            'tenant_id' => $tenantId,
            'phone' => $phone,
            'email' => $deliveryEmail ?: '',
            'channel' => $channel,
            'purpose' => 'password_reset',
            'otp_hash' => Hash::make($otp),
            'expires_at' => now()->addMinutes(self::OTP_TTL_MINUTES),
            'attempts' => 0,
            'created_at' => now(),
        ]);

        $this->auditLogService->log(
            'customer.auth.password_reset_requested',
            $tenantId,
            null,
            'customer',
            $customer->id,
            ['channel' => $channel],
        );

        return [
            'sent' => true,
            'channel' => $channel,
            'channels' => $channels,
            'expires_in_seconds' => self::OTP_TTL_MINUTES * 60,
        ];
    }

    /**
     * @return array{session_token: string, expires_at: string, customer: array<string, mixed>}
     */
    public function resetPassword(string $phone, string $otp, string $password): array
    {
        $tenantId = $this->tenantContext->id();
        $phone = $this->normalizePhone($phone);
        $otp = trim($otp);
        $this->assertPasswordStrength($password);

        $record = CustomerEmailOtp::where('tenant_id', $tenantId)
            ->where('phone', $phone)
            ->where('purpose', 'password_reset')
            ->orderByDesc('created_at')
            ->first();

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
        $customer->password = $password;
        $customer->save();

        CustomerEmailOtp::where('tenant_id', $tenantId)
            ->where('phone', $phone)
            ->where('purpose', 'password_reset')
            ->delete();

        $session = $this->issueSession($customer, $customer->email ?: '', 'account');

        $this->auditLogService->log(
            'customer.auth.password_set',
            $tenantId,
            null,
            'customer',
            $customer->id,
            ['via' => 'reset'],
        );

        return [
            'session_token' => $session->getAttribute('_plain_token'),
            'expires_at' => $session->expires_at->toIso8601String(),
            'customer' => $this->customerPayload($customer->fresh()),
        ];
    }

    /**
     * Set or change password while authenticated (optional current password when already set).
     */
    public function setPassword(CustomerSession $session, string $password, ?string $currentPassword = null): Customer
    {
        $customer = Customer::findOrFail($session->customer_id);
        $this->assertPasswordStrength($password);

        if ($customer->password) {
            if (! $currentPassword || ! Hash::check($currentPassword, $customer->password)) {
                throw ValidationException::withMessages([
                    'current_password' => ['Enter your current password to change it.'],
                ]);
            }
        }

        $customer->password = $password;
        $customer->save();

        $this->auditLogService->log(
            'customer.auth.password_set',
            $this->tenantContext->id(),
            null,
            'customer',
            $customer->id,
            ['via' => 'account'],
        );

        return $customer->fresh();
    }

    public function assertPasswordStrength(string $password): void
    {
        if (strlen($password) < 8) {
            throw ValidationException::withMessages([
                'password' => ['Password must be at least 8 characters.'],
            ]);
        }
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
            'has_password' => filled($customer->password),
            'has_passkeys' => $customer->webauthnCredentials()->exists(),
        ];
    }

    public function normalizePhone(string $phone): string
    {
        return preg_replace('/\s+/', '', trim($phone)) ?? '';
    }

    /**
     * Always attempt email (when address present) and WhatsApp in parallel.
     *
     * @return array{channels: list<string>, email_sent: bool, whatsapp_sent: bool}
     */
    private function deliverOtpToEmailAndWhatsApp(
        Customer $customer,
        string $otp,
        string $restaurant,
        ?string $deliveryEmail,
        string $tenantId,
        string $purpose,
        string $whatsAppType,
        string $whatsAppMessage,
    ): array {
        $channels = [];
        $emailSent = false;
        $whatsappSent = false;
        $emailError = null;
        $whatsappError = null;

        if ($deliveryEmail) {
            try {
                $this->sendOtpMail(
                    $deliveryEmail,
                    new CustomerProximityOtpMail(
                        $customer->name ?: 'there',
                        $otp,
                        $restaurant,
                        $purpose,
                    ),
                );
                $emailSent = true;
                $channels[] = 'email';
            } catch (\Throwable $e) {
                $emailError = $e->getMessage();
                Log::error('customer.auth.otp_email_failed', [
                    'tenant_id' => $tenantId,
                    'customer_id' => $customer->id,
                    'email' => $deliveryEmail,
                    'purpose' => $purpose,
                    'error' => $emailError,
                ]);
            }
        }

        if ($customer->phone && app()->runningUnitTests()) {
            $whatsappSent = true;
            $channels[] = 'whatsapp';
        } elseif ($customer->phone) {
            try {
                $this->whatsAppProvider->send(
                    $customer->phone,
                    $whatsAppMessage,
                    ['type' => $whatsAppType, 'tenant_id' => $tenantId],
                );
                $whatsappSent = true;
                $channels[] = 'whatsapp';
            } catch (\Throwable $e) {
                $whatsappError = $e->getMessage();
                Log::error('customer.auth.otp_whatsapp_failed', [
                    'tenant_id' => $tenantId,
                    'customer_id' => $customer->id,
                    'phone' => $customer->phone,
                    'purpose' => $purpose,
                    'error' => $whatsappError,
                ]);
            }
        }

        if (! $emailSent && ! $whatsappSent) {
            $detail = trim(implode(' ', array_filter([$emailError, $whatsappError])));
            throw ValidationException::withMessages([
                'phone' => [
                    $detail !== ''
                        ? 'Could not send a verification code. '.$detail
                        : 'Could not send a verification code to email or WhatsApp. Try again.',
                ],
            ]);
        }

        return [
            'channels' => $channels,
            'email_sent' => $emailSent,
            'whatsapp_sent' => $whatsappSent,
        ];
    }

    private function sendOtpMail(string $to, CustomerProximityOtpMail $mail): void
    {
        $mailer = (string) config('mail.default');
        if ($mailer === 'log' && ! app()->runningUnitTests()) {
            $smtpHost = (string) config('mail.mailers.smtp.host');
            if ($smtpHost !== '' && ! in_array($smtpHost, ['127.0.0.1', 'localhost'], true)) {
                Mail::mailer('smtp')->to($to)->send($mail);

                return;
            }

            throw new \RuntimeException(
                'Email delivery is set to log only. Set MAIL_MAILER=smtp on the server to send verification codes.',
            );
        }

        Mail::to($to)->send($mail);
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
        $delivered = $this->deliverOtpToEmailAndWhatsApp(
            $customer,
            $otp,
            $restaurant,
            $deliveryEmail,
            $tenantId,
            'phone-change',
            'phone_change_otp',
            "Your {$restaurant} phone-change code is {$otp}. It expires in ".self::OTP_TTL_MINUTES.' minutes.',
        );
        $channels = $delivered['channels'];
        $emailSent = $delivered['email_sent'];
        $whatsappSent = $delivered['whatsapp_sent'];
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
