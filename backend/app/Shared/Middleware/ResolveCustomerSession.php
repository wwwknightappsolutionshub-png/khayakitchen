<?php

namespace App\Shared\Middleware;

use App\Shared\Utils\ApiResponse;
use Closure;
use Illuminate\Http\Request;

class ResolveCustomerSession
{
    public function __construct(private \App\Modules\CRM\Application\Services\CustomerAuthService $authService) {}

    public function handle(Request $request, Closure $next)
    {
        $token = $request->header('X-Customer-Session')
            ?? $request->bearerToken();

        if (! $token) {
            return ApiResponse::error('Customer session required', 'UNAUTHORIZED', null, 401);
        }

        $session = $this->authService->resolveSession($token);
        if (! $session) {
            return ApiResponse::error('Invalid or expired customer session', 'UNAUTHORIZED', null, 401);
        }

        $request->attributes->set('customer_session', $session);

        return $next($request);
    }
}
