<?php

namespace App\Shared\Auth;

class PermissionService
{
    private const ROLE_PERMISSIONS = [
        'super_admin' => [
            'settings.manage',
            'feature_flags.manage',
            'campaigns.manage',
            'campaigns.view',
            'revenue_recovery.manage',
            'revenue_recovery.view',
            'branding.manage',
            'branding.view',
        ],
        'platform_admin' => [
            'settings.manage',
            'campaigns.view',
        ],
        'platform_support' => [
            'campaigns.view',
        ],
        'owner' => [
            'orders.create',
            'orders.update',
            'orders.view',
            'inventory.manage',
            'inventory.adjust',
            'crm.view',
            'crm.manage',
            'loyalty.manage',
            'dashboard.view',
            'settings.manage',
            'staff.manage',
            'menu.manage',
            'kitchen.view',
            'delivery.manage',
            'notifications.view',
            'campaigns.manage',
            'campaigns.view',
            'revenue_recovery.manage',
            'revenue_recovery.view',
            'branding.manage',
            'branding.view',
        ],
        'manager' => [
            'orders.create',
            'orders.update',
            'orders.view',
            'inventory.manage',
            'inventory.adjust',
            'crm.view',
            'dashboard.view',
            'staff.manage',
            'menu.manage',
            'kitchen.view',
            'delivery.manage',
            'notifications.view',
            'campaigns.view',
            'revenue_recovery.view',
            'branding.view',
        ],
        'kitchen' => [
            'orders.view',
            'orders.update_status',
            'kitchen.view',
        ],
        'staff' => [
            'orders.create',
            'orders.view',
            'orders.update',
            'menu.manage',
            'notifications.view',
        ],
        'customer' => [
            'orders.create',
            'orders.view_own',
        ],
    ];

    public function forRole(?string $role): array
    {
        if (! $role) {
            return [];
        }

        return self::ROLE_PERMISSIONS[$role] ?? [];
    }

    public function has(array $permissions, string $permission): bool
    {
        if (in_array($permission, $permissions, true)) {
            return true;
        }

        foreach ($permissions as $granted) {
            if (str_ends_with($granted, '.*')) {
                $prefix = rtrim($granted, '.*');
                if (str_starts_with($permission, $prefix)) {
                    return true;
                }
            }
        }

        return false;
    }

    public function authorize(array $permissions, string $permission): void
    {
        if (! $this->has($permissions, $permission)) {
            abort(403, 'Insufficient permissions');
        }
    }
}
