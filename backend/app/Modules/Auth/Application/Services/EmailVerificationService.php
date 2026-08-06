<?php

namespace App\Modules\Auth\Application\Services;

use App\Modules\Auth\Domain\Models\Tenant;
use App\Modules\Auth\Domain\Models\User;
use App\Modules\Auth\Mail\EmailVerificationMail;
use App\Modules\Notifications\Infrastructure\WhatsApp\Contracts\WhatsAppProviderInterface;
use App\Modules\Platform\Mail\WelcomeOwnerMail;
use App\Modules\TenantBranding\Domain\Models\TenantBranding;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Throwable;

class EmailVerificationService
{
  public function __construct(
    private WhatsAppProviderInterface $whatsAppProvider,
  ) {}

  public function createAndSendVerification(User $user, ?string $tenantSlug = null): void
  {
    if ($user->isEmailVerified()) {
      return;
    }

    $plainToken = Str::random(64);
    $tenantSlug ??= $this->resolveTenantSlug($user);

    DB::table('email_verification_tokens')->where('user_id', $user->id)->delete();

    DB::table('email_verification_tokens')->insert([
      'id' => (string) Str::uuid(),
      'user_id' => $user->id,
      'token' => Hash::make($plainToken),
      'expires_at' => now()->addHours(24),
      'created_at' => now(),
    ]);

    $verifyUrl = $this->buildVerifyUrl($plainToken, $user->email, $tenantSlug);

    try {
      Mail::to($user->email)->send(new EmailVerificationMail(
        ownerName: $user->name,
        verifyUrl: $verifyUrl,
        tenantSlug: $tenantSlug,
      ));
    } catch (Throwable $e) {
      Log::error('Email verification mail failed to send', [
        'user_id' => $user->id,
        'email' => $user->email,
        'error' => $e->getMessage(),
      ]);
    }
  }

  public function verify(string $token, string $email): array
  {
    $user = User::withoutGlobalScopes()->where('email', $email)->first();

    if (! $user) {
      throw ValidationException::withMessages([
        'token' => ['This verification link is invalid or has expired.'],
      ]);
    }

    if ($user->isEmailVerified()) {
      return [
        'message' => 'Your email is already verified. You can sign in now.',
        'already_verified' => true,
        'tenant_slug' => $this->resolveTenantSlug($user),
        'email' => $user->email,
      ];
    }

    $record = DB::table('email_verification_tokens')
      ->where('user_id', $user->id)
      ->where('expires_at', '>', now())
      ->first();

    if (! $record || ! Hash::check($token, $record->token)) {
      throw ValidationException::withMessages([
        'token' => ['This verification link is invalid or has expired.'],
      ]);
    }

    $user->update(['email_verified_at' => now()]);

    DB::table('email_verification_tokens')->where('user_id', $user->id)->delete();

    DB::table('activity_logs')->insert([
      'id' => (string) Str::uuid(),
      'tenant_id' => $user->tenant_id ?? $user->id,
      'user_id' => $user->id,
      'action' => 'auth.email_verified',
      'entity_type' => 'user',
      'entity_id' => $user->id,
      'metadata' => json_encode(['email' => $user->email]),
      'created_at' => now(),
    ]);

    $this->sendWelcomeEmailAfterVerification($user);

    return [
      'message' => 'Email verified successfully. Your account is now active.',
      'already_verified' => false,
      'tenant_slug' => $this->resolveTenantSlug($user),
      'email' => $user->email,
    ];
  }

  public function resend(string $email, ?string $tenantSlug = null): array
  {
    $user = $this->resolveUserByEmail($email, $tenantSlug);

    if (! $user) {
      return ['message' => 'If an account exists for that email, a verification link has been sent.'];
    }

    if ($user->isEmailVerified()) {
      throw ValidationException::withMessages([
        'email' => ['This email address is already verified.'],
      ]);
    }

    $this->createAndSendVerification($user, $tenantSlug);

    return ['message' => 'If an account exists for that email, a verification link has been sent.'];
  }

  private function resolveUserByEmail(string $email, ?string $tenantSlug): ?User
  {
    if ($tenantSlug) {
      $tenant = Tenant::withoutGlobalScopes()->where('slug', $tenantSlug)->first();
      if (! $tenant) {
        return null;
      }

      return User::withoutGlobalScopes()
        ->where('email', $email)
        ->where('tenant_id', $tenant->id)
        ->first();
    }

    $candidates = User::withoutGlobalScopes()->where('email', $email)->get();
    if ($candidates->count() !== 1) {
      return null;
    }

    return $candidates->first();
  }

  private function resolveTenantSlug(User $user): ?string
  {
    if (! $user->tenant_id) {
      return null;
    }

    return Tenant::withoutGlobalScopes()->where('id', $user->tenant_id)->value('slug');
  }

  private function buildVerifyUrl(string $plainToken, string $email, ?string $tenantSlug): string
  {
    $base = rtrim((string) config('app.frontend_url', env('FRONTEND_URL', 'http://localhost:3000')), '/');

  return $base.'/ops/verify-email?'.http_build_query(array_filter([
      'token' => $plainToken,
      'email' => $email,
      'tenant' => $tenantSlug,
    ]));
  }

  private function sendWelcomeEmailAfterVerification(User $user): void
  {
    if (! $user->tenant_id || $user->role !== 'owner') {
      return;
    }

    $tenant = Tenant::withoutGlobalScopes()->find($user->tenant_id);
    if (! $tenant) {
      return;
    }

    $subscription = DB::table('tenant_subscriptions')
      ->join('plans', 'plans.id', '=', 'tenant_subscriptions.plan_id')
      ->where('tenant_subscriptions.tenant_id', $tenant->id)
      ->orderByDesc('tenant_subscriptions.created_at')
      ->select('plans.name as plan_name')
      ->first();

    $branding = TenantBranding::withoutGlobalScopes()
      ->where('tenant_id', $tenant->id)
      ->first();

    $loginUrl = rtrim((string) config('app.frontend_url', env('FRONTEND_URL', 'http://localhost:3000')), '/').'/ops/login?'.http_build_query([
      'email' => $user->email,
      'tenant' => $tenant->slug,
      'welcome' => '1',
    ]);

    try {
      Mail::to($user->email)->send(new WelcomeOwnerMail(
        ownerName: $user->name,
        restaurantName: $branding?->restaurant_name ?? $tenant->name,
        tenantSlug: $tenant->slug,
        ownerEmail: $user->email,
        loginUrl: $loginUrl,
        planName: $subscription->plan_name ?? 'Starter',
      ));
    } catch (Throwable $e) {
      Log::error('Post-verification welcome email failed to send', [
        'user_id' => $user->id,
        'email' => $user->email,
        'error' => $e->getMessage(),
      ]);
    }

    $ownerPhone = (string) data_get($tenant->signup_metadata, 'owner_phone', '');
    $ownerPhone = preg_replace('/\s+/', '', trim($ownerPhone)) ?? '';
    if ($ownerPhone === '') {
      return;
    }

    $restaurant = $branding?->restaurant_name ?? $tenant->name;
    $planName = $subscription->plan_name ?? 'Starter';
    $message = "Welcome to KhayaOS, {$user->name}! ".
      "Your workspace {$restaurant} is now active on {$planName}. ".
      "Sign in here: {$loginUrl}";

    try {
      $this->whatsAppProvider->send($ownerPhone, $message, [
        'type' => 'owner_welcome',
        'tenant_id' => $tenant->id,
        'user_id' => $user->id,
      ]);
    } catch (Throwable $e) {
      Log::warning('Post-verification welcome WhatsApp failed', [
        'tenant_id' => $tenant->id,
        'user_id' => $user->id,
        'phone' => $ownerPhone,
        'error' => $e->getMessage(),
      ]);
    }
  }
}
