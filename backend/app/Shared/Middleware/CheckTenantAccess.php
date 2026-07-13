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

        if (in_array($user->role, ['platform_admin', 'platform_support'], true)) {
            return ApiResponse::error(
                'Platform staff cannot access tenant routes. Use /api/v1/platform/* messaging endpoints.',
                'PLATFORM_ONLY',
                null,
                403,
            );
        }

        // Customer storefront/order APIs follow X-Tenant-Slug from shared links.
        // Do not reject staff who still have a leftover Sanctum session while ordering elsewhere.
        if ($this->isCustomerFacingRequest($request)) {
            return $next($request);
        }

        if ($user->status !== 'active') {
            return ApiResponse::error('User account is disabled', 'USER_DISABLED', null, 403);
        }

        if ($user->tenant_id && ! $user->isEmailVerified()) {
            return ApiResponse::error(
                'Please verify your email before accessing this workspace.',
                'EMAIL_NOT_VERIFIED',
                null,
                403,
            );
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

    private function isCustomerFacingRequest(Request $request): bool
    {
        $path = $request->path();

        return str_starts_with($path, 'api/v1/storefront')
            || str_starts_with($path, 'api/v1/customer/')
            || $path === 'api/v1/menu'
            || str_starts_with($path, 'api/v1/realtime/public-config')
            || str_starts_with($path, 'api/v1/realtime/order-status/');
    }
}
