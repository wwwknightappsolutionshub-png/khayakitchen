<?php

namespace App\Shared\Middleware;

use App\Shared\Tenancy\TenantContext;
use App\Shared\Utils\ApiResponse;
use Closure;
use Illuminate\Http\Request;

class CheckTenantAccess
{
    public function __construct(private TenantContext $tenantContext) {}

    public function handle(Request $request, Closure $next)
    {
        $user = $request->user();

        if (! $user) {
            return $next($request);
        }

        if ($user->role === 'super_admin') {
            return ApiResponse::error(
                'Super admin cannot access tenant routes. Use /api/v1/platform/* endpoints.',
                'PLATFORM_ONLY',
                null,
                403,
            );
        }

        if ($user->status !== 'active') {
            return ApiResponse::error('User account is disabled', 'USER_DISABLED', null, 403);
        }

        $tenantId = $this->tenantContext->id();
        if (! $tenantId || $user->tenant_id !== $tenantId) {
            return ApiResponse::error('Tenant access denied', 'TENANT_ACCESS_DENIED', null, 403);
        }

        $tenant = $this->tenantContext->tenant();
        if ($tenant && $tenant->status !== 'active') {
            return ApiResponse::error('Tenant is suspended', 'TENANT_SUSPENDED', null, 403);
        }

        return $next($request);
    }
}
