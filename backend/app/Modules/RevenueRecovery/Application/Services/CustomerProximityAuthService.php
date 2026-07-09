<?php

namespace App\Modules\RevenueRecovery\Application\Services;

use App\Modules\CRM\Domain\Models\Customer;
use App\Modules\RevenueRecovery\Domain\Models\CustomerEmailOtp;
use App\Modules\RevenueRecovery\Domain\Models\CustomerSession;
use App\Modules\RevenueRecovery\Mail\CustomerProximityOtpMail;
use App\Modules\TenantBranding\Application\Services\BrandingService;
use App\Shared\Tenancy\TenantContext;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class CustomerProximityAuthService
{
    private const OTP_TTL_MINUTES = 10;

    private const MAX_OTP_ATTEMPTS = 5;

    private const SESSION_TTL_DAYS = 30;

    public function __construct(
        private TenantContext $tenantContext,
        private TenantRevenueRecoverySettingsService $settingsService,
        private BrandingService $brandingService,
    ) {}

    public function requestOtp(string $phone, string $email): array
    {
        $this->assertProximityEnabled();

        $tenantId = $this->tenantContext->id();
        $phone = $this->normalizePhone($phone);
        $email = strtolower(trim($email));

        if ($phone === '' || ! filter_var($email, FILTER_VALIDATE_EMAIL)) {
            throw ValidationException::withMessages([
                'phone' => ['Enter a valid phone number and email address.'],
            ]);
        }

        $customer = Customer::where('tenant_id', $tenantId)
            ->where('phone', $phone)
            ->first();

        if (! $customer) {
            throw ValidationException::withMessages([
                'phone' => ['We could not find an account with this phone number. Place an order first or check the number.'],
            ]);
        }

        if ($customer->email && strtolower($customer->email) !== $email) {
            throw ValidationException::withMessages([
                'email' => ['This email does not match our records for that phone number.'],
            ]);
        }

        if (! $customer->email) {
            $customer->update(['email' => $email]);
        }

        CustomerEmailOtp::where('tenant_id', $tenantId)
            ->where('phone', $phone)
            ->delete();

        $otp = (string) random_int(100000, 999999);

        CustomerEmailOtp::create([
            'tenant_id' => $tenantId,
            'phone' => $phone,
            'email' => $email,
            'otp_hash' => Hash::make($otp),
            'expires_at' => now()->addMinutes(self::OTP_TTL_MINUTES),
            'attempts' => 0,
            'created_at' => now(),
        ]);

        $branding = $this->brandingService->getForTenant($tenantId);
        Mail::to($email)->send(new CustomerProximityOtpMail(
            $customer->name ?: 'there',
            $otp,
            $branding->restaurant_name ?? 'Our kitchen',
        ));

        return [
            'sent' => true,
            'expires_in_seconds' => self::OTP_TTL_MINUTES * 60,
        ];
    }

    public function verifyOtp(string $phone, string $email, string $otp): array
    {
        $this->assertProximityEnabled();

        $tenantId = $this->tenantContext->id();
        $phone = $this->normalizePhone($phone);
        $email = strtolower(trim($email));
        $otp = trim($otp);

        $record = CustomerEmailOtp::where('tenant_id', $tenantId)
            ->where('phone', $phone)
            ->where('email', $email)
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

        $customer = Customer::where('tenant_id', $tenantId)
            ->where('phone', $phone)
            ->firstOrFail();

        CustomerEmailOtp::where('tenant_id', $tenantId)
            ->where('phone', $phone)
            ->delete();

        CustomerSession::where('tenant_id', $tenantId)
            ->where('customer_id', $customer->id)
            ->delete();

        $plainToken = Str::random(64);

        $session = CustomerSession::create([
            'tenant_id' => $tenantId,
            'customer_id' => $customer->id,
            'phone' => $phone,
            'email' => $email,
            'token_hash' => hash('sha256', $plainToken),
            'location_opt_in' => false,
            'last_seen_at' => now(),
            'expires_at' => now()->addDays(self::SESSION_TTL_DAYS),
        ]);

        return [
            'session_token' => $plainToken,
            'expires_at' => $session->expires_at->toIso8601String(),
            'customer' => [
                'id' => $customer->id,
                'name' => $customer->name,
                'phone' => $customer->phone,
                'email' => $customer->email,
            ],
        ];
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

    public function updateLocationOptIn(CustomerSession $session, bool $optIn): CustomerSession
    {
        $session->update(['location_opt_in' => $optIn]);

        return $session->fresh();
    }

    private function assertProximityEnabled(): void
    {
        if (! $this->settingsService->isProximityEnabled()) {
            abort(403, 'Proximity revenue recovery is not enabled for this restaurant');
        }
    }

    private function normalizePhone(string $phone): string
    {
        return preg_replace('/\s+/', '', trim($phone)) ?? '';
    }
}
