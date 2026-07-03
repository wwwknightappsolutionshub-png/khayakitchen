<?php

namespace App\Shared\Middleware;

use App\Modules\Auth\Domain\Models\Tenant;
use App\Shared\Tenancy\TenantContext;
use App\Shared\Utils\ApiResponse;
use Closure;
use Illuminate\Http\Request;

class ResolveTenant
{
    public function __construct(private TenantContext $tenantContext) {}

    public function handle(Request $request, Closure $next)
    {
        $user = $request->user();
        $tenantId = null;

        if ($user && $user->tenant_id) {
            $tenantId = $user->tenant_id;
        } elseif ($request->header('X-Tenant-ID')) {
            $tenantId = $request->header('X-Tenant-ID');
        } elseif ($slug = $request->header('X-Tenant-Slug')) {
            $tenant = Tenant::withoutGlobalScopes()->where('slug', $slug)->first();
            $tenantId = $tenant?->id;
        } elseif ($host = $request->getHost()) {
            $parts = explode('.', $host);
            if (count($parts) > 2 && $parts[0] !== 'api' && $parts[0] !== 'www') {
                $tenant = Tenant::withoutGlobalScopes()->where('slug', $parts[0])->first();
                $tenantId = $tenant?->id;
            }
        }

        if (! $tenantId && $user) {
            if ($user->role === 'super_admin') {
                $this->tenantContext->setUser($user);

                return $next($request);
            }

            return ApiResponse::error('Tenant could not be resolved', 'TENANT_NOT_RESOLVED', null, 400);
        }

        if ($tenantId) {
            $tenant = Tenant::withoutGlobalScopes()->find($tenantId);
            if (! $tenant) {
                return ApiResponse::error('Tenant not found', 'TENANT_NOT_FOUND', null, 404);
            }
            $this->tenantContext->setTenant($tenant);
        }

        if ($user) {
            $this->tenantContext->setUser($user);
        }

        $request->attributes->set('tenant', $this->tenantContext->tenant());

        return $next($request);
    }
}
