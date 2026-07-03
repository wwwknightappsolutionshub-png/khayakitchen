<?php

use Illuminate\Support\Facades\Broadcast;

Broadcast::channel('tenant.{tenantId}.admin', function ($user, string $tenantId) {
    if (! $user || $user->role === 'super_admin') {
        return false;
    }

    return (string) $user->tenant_id === (string) $tenantId;
});

Broadcast::channel('tenant.{tenantId}.kitchen', function ($user, string $tenantId) {
    if (! $user || $user->role === 'super_admin') {
        return false;
    }

    return (string) $user->tenant_id === (string) $tenantId;
});
