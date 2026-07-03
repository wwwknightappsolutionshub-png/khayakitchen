<?php

namespace App\Shared\Middleware;

use App\Shared\Utils\ApiResponse;
use Closure;
use Illuminate\Http\Request;

class EnsureSuperAdmin
{
    public function handle(Request $request, Closure $next)
    {
        $user = $request->user();

        if (! $user || $user->role !== 'super_admin') {
            return ApiResponse::error('Super admin access required', 'PLATFORM_FORBIDDEN', null, 403);
        }

        return $next($request);
    }
}
