<?php

namespace App\Shared\Middleware;

use App\Shared\Auth\PermissionService;
use App\Shared\Tenancy\TenantContext;
use Closure;
use Illuminate\Http\Request;

class LoadPermissions
{
    public function __construct(
        private TenantContext $tenantContext,
        private PermissionService $permissionService,
    ) {}

    public function handle(Request $request, Closure $next)
    {
        $user = $this->tenantContext->user() ?? $request->user();
        $permissions = $this->permissionService->forRole($user?->role);

        $request->attributes->set('permissions', $permissions);
        $request->merge(['permissions' => $permissions]);

        return $next($request);
    }
}
