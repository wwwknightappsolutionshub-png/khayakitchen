<?php

namespace App\Shared\Middleware;

use App\Shared\Auth\PlatformRoles;
use App\Shared\Utils\ApiResponse;
use Closure;
use Illuminate\Http\Request;

class EnsurePlatformStaff
{
    public function handle(Request $request, Closure $next)
    {
        $user = $request->user();

        if (! PlatformRoles::isPlatformStaff($user)) {
            return ApiResponse::error('Platform staff access required', 'PLATFORM_FORBIDDEN', null, 403);
        }

        if ($user->status !== 'active') {
            return ApiResponse::error('User account is disabled', 'USER_DISABLED', null, 403);
        }

        return $next($request);
    }
}
