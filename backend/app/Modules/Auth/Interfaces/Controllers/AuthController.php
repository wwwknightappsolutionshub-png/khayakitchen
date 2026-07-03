<?php

namespace App\Modules\Auth\Interfaces\Controllers;

use App\Modules\Auth\Application\Services\AuthService;
use App\Shared\Utils\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;

class AuthController extends Controller
{
    public function __construct(private AuthService $authService) {}

    public function login(Request $request)
    {
        $data = $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required', 'string'],
            'tenant_slug' => ['nullable', 'string'],
        ]);

        $tenantSlug = $data['tenant_slug'] ?? $request->header('X-Tenant-Slug');

        return ApiResponse::success(
            $this->authService->login($data['email'], $data['password'], $tenantSlug),
        );
    }

    public function logout(Request $request)
    {
        $this->authService->logout($request->user());

        return ApiResponse::success(['message' => 'Logged out']);
    }

    public function me(Request $request)
    {
        return ApiResponse::success($this->authService->me($request->user()));
    }
}
