<?php

namespace App\Shared\Auth;

use App\Modules\Auth\Domain\Models\User;

class PlatformRoles
{
    public const OWNER = 'super_admin';

    public const ADMIN = 'platform_admin';

    public const SUPPORT = 'platform_support';

    /** @return list<string> */
    public static function all(): array
    {
        return [self::OWNER, self::ADMIN, self::SUPPORT];
    }

    public static function isPlatformStaff(?User $user): bool
    {
        return $user !== null && in_array($user->role, self::all(), true);
    }

    public static function labelForRole(string $role): string
    {
        return match ($role) {
            self::OWNER => 'Platform Owner',
            self::ADMIN => 'Platform Admin',
            self::SUPPORT => 'Platform Support',
            default => $role,
        };
    }
}
