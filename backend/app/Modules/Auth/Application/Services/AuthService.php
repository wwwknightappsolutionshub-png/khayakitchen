<?php

namespace App\Modules\Auth\Application\Services;

use App\Modules\Auth\Domain\Models\Tenant;
use App\Modules\Auth\Domain\Models\User;
use App\Shared\Tenancy\TenantContext;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class AuthService
{
    public function __construct(private TenantContext $tenantContext) {}

    public function login(string $email, string $password, ?string $tenantSlug = null): array
    {
        $query = User::withoutGlobalScopes()->where('email', $email);

        if ($tenantSlug) {
            $tenant = Tenant::withoutGlobalScopes()->where('slug', $tenantSlug)->first();

            if (! $tenant) {
                throw ValidationException::withMessages([
                    'tenant_slug' => ['The specified tenant could not be found.'],
                ]);
            }

            $query->where('tenant_id', $tenant->id);
        } else {
            $query->whereNull('tenant_id');
        }

        $user = $query->first();

        if (! $user || ! Hash::check($password, $user->password)) {
            throw ValidationException::withMessages([
                'email' => ['The provided credentials are incorrect.'],
            ]);
        }

        if ($user->status !== 'active') {
            throw ValidationException::withMessages([
                'email' => ['This account has been disabled.'],
            ]);
        }

        $user->update(['last_login_at' => now()]);
        $this->tenantContext->setUser($user);
        if ($user->tenant_id) {
            $this->tenantContext->setTenantId($user->tenant_id);
        }

        $token = $user->createToken('api-token', ['*'])->plainTextToken;

        DB::table('activity_logs')->insert([
            'id' => (string) Str::uuid(),
            'tenant_id' => $user->tenant_id ?? $user->id,
            'user_id' => $user->id,
            'action' => 'auth.login',
            'entity_type' => 'user',
            'entity_id' => $user->id,
            'metadata' => json_encode([
                'email' => $user->email,
                'tenant_slug' => $tenantSlug,
            ]),
            'created_at' => now(),
        ]);

        return [
            'token' => $token,
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'role' => $user->role,
                'tenant_id' => $user->tenant_id,
            ],
        ];
    }

    public function logout(User $user): void
    {
        $user->currentAccessToken()?->delete();

        DB::table('activity_logs')->insert([
            'id' => (string) Str::uuid(),
            'tenant_id' => $user->tenant_id ?? $user->id,
            'user_id' => $user->id,
            'action' => 'auth.logout',
            'entity_type' => 'user',
            'entity_id' => $user->id,
            'metadata' => json_encode([]),
            'created_at' => now(),
        ]);
    }

    public function me(User $user): array
    {
        return [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'role' => $user->role,
            'tenant_id' => $user->tenant_id,
            'status' => $user->status,
        ];
    }

    public function updateEmail(User $user, string $email, string $currentPassword): array
    {
        if (! Hash::check($currentPassword, $user->password)) {
            throw ValidationException::withMessages([
                'current_password' => ['The current password is incorrect.'],
            ]);
        }

        $duplicateQuery = User::withoutGlobalScopes()
            ->where('email', $email)
            ->where('id', '!=', $user->id);

        if ($user->tenant_id) {
            $duplicateQuery->where('tenant_id', $user->tenant_id);
        } else {
            $duplicateQuery->whereNull('tenant_id');
        }

        if ($duplicateQuery->exists()) {
            throw ValidationException::withMessages([
                'email' => ['Email already in use.'],
            ]);
        }

        $user->update(['email' => $email]);

        DB::table('activity_logs')->insert([
            'id' => (string) Str::uuid(),
            'tenant_id' => $user->tenant_id ?? $user->id,
            'user_id' => $user->id,
            'action' => 'auth.email_updated',
            'entity_type' => 'user',
            'entity_id' => $user->id,
            'metadata' => json_encode([
                'email' => $email,
            ]),
            'created_at' => now(),
        ]);

        return $this->me($user->fresh());
    }

    public function updatePassword(User $user, string $currentPassword, string $newPassword): void
    {
        if (! Hash::check($currentPassword, $user->password)) {
            throw ValidationException::withMessages([
                'current_password' => ['The current password is incorrect.'],
            ]);
        }

        $user->update(['password' => $newPassword]);

        DB::table('activity_logs')->insert([
            'id' => (string) Str::uuid(),
            'tenant_id' => $user->tenant_id ?? $user->id,
            'user_id' => $user->id,
            'action' => 'auth.password_updated',
            'entity_type' => 'user',
            'entity_id' => $user->id,
            'metadata' => json_encode([]),
            'created_at' => now(),
        ]);
    }
}
