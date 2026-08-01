<?php

namespace App\Modules\Auth\Application\Services;

use App\Modules\Auth\Domain\Models\Tenant;
use App\Modules\Auth\Domain\Models\User;
use App\Modules\Auth\Mail\PasswordResetMail;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Throwable;

class PasswordResetService
{
    public function sendResetLink(string $email, ?string $tenantSlug = null): array
    {
        $user = $this->resolveUserByEmail($email, $tenantSlug);

        if (! $user || ! $user->isEmailVerified()) {
            return ['message' => 'If an account exists for that email, a password reset link has been sent.'];
        }

        $plainToken = Str::random(64);
        $resolvedTenantSlug = $this->resolveTenantSlug($user);

        DB::table('password_reset_tokens')->updateOrInsert(
            ['email' => $user->email],
            [
                'token' => Hash::make($plainToken),
                'created_at' => now(),
            ],
        );

        $resetUrl = $this->buildResetUrl($plainToken, $user->email, $resolvedTenantSlug);

        try {
            Mail::to($user->email)->send(new PasswordResetMail(
                ownerName: $user->name,
                resetUrl: $resetUrl,
            ));
        } catch (Throwable $e) {
            Log::error('Password reset mail failed to send', [
                'user_id' => $user->id,
                'email' => $user->email,
                'error' => $e->getMessage(),
            ]);
        }

        return ['message' => 'If an account exists for that email, a password reset link has been sent.'];
    }

    public function resetPassword(
        string $email,
        string $token,
        string $password,
        ?string $tenantSlug = null,
    ): array {
        $user = $this->resolveUserByEmail($email, $tenantSlug);

        if (! $user) {
            throw ValidationException::withMessages([
                'email' => ['Unable to reset password for this account.'],
            ]);
        }

        $record = DB::table('password_reset_tokens')
            ->where('email', $user->email)
            ->first();

        $expiresMinutes = (int) config('auth.passwords.users.expire', 60);

        if (
            ! $record
            || ! $record->created_at
            || now()->diffInMinutes($record->created_at) > $expiresMinutes
            || ! Hash::check($token, $record->token)
        ) {
            throw ValidationException::withMessages([
                'token' => ['This password reset link is invalid or has expired.'],
            ]);
        }

        $user->update(['password' => $password]);
        DB::table('password_reset_tokens')->where('email', $user->email)->delete();

        DB::table('activity_logs')->insert([
            'id' => (string) Str::uuid(),
            'tenant_id' => $user->tenant_id ?? $user->id,
            'user_id' => $user->id,
            'action' => 'auth.password_reset',
            'entity_type' => 'user',
            'entity_id' => $user->id,
            'metadata' => json_encode(['email' => $user->email]),
            'created_at' => now(),
        ]);

        return [
            'message' => 'Password reset successfully. You can sign in with your new password.',
            'tenant_slug' => $this->resolveTenantSlug($user),
            'email' => $user->email,
        ];
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

    private function buildResetUrl(string $plainToken, string $email, ?string $tenantSlug): string
    {
        $base = rtrim((string) config('app.frontend_url', env('FRONTEND_URL', 'http://localhost:3000')), '/');

        return $base.'/ops/reset-password?'.http_build_query(array_filter([
            'token' => $plainToken,
            'email' => $email,
            'tenant' => $tenantSlug,
        ]));
    }
}
