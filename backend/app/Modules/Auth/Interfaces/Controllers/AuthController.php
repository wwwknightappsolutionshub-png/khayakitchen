<?php

namespace App\Modules\Auth\Interfaces\Controllers;

use App\Modules\Auth\Application\Services\AuthService;
use App\Modules\Auth\Application\Services\EmailVerificationService;
use App\Modules\Auth\Application\Services\PasswordResetService;
use App\Shared\Utils\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;

class AuthController extends Controller
{
    public function __construct(
        private AuthService $authService,
        private EmailVerificationService $emailVerificationService,
        private PasswordResetService $passwordResetService,
    ) {}

    public function login(Request $request)
    {
        $data = $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required', 'string'],
            'tenant_slug' => ['nullable', 'string'],
        ]);

        $tenantSlug = $data['tenant_slug'] ?? null;

        return ApiResponse::success(
            $this->authService->login($data['email'], $data['password'], $tenantSlug),
        );
    }

    public function verifyEmail(Request $request)
    {
        $data = $request->validate([
            'token' => ['required', 'string'],
            'email' => ['required', 'email'],
        ]);

        return ApiResponse::success(
            $this->emailVerificationService->verify($data['token'], $data['email']),
        );
    }

    public function resendVerification(Request $request)
    {
        $data = $request->validate([
            'email' => ['required', 'email'],
            'tenant_slug' => ['nullable', 'string'],
        ]);

        return ApiResponse::success(
            $this->emailVerificationService->resend($data['email'], $data['tenant_slug'] ?? null),
        );
    }

    public function forgotPassword(Request $request)
    {
        $data = $request->validate([
            'email' => ['required', 'email'],
            'tenant_slug' => ['nullable', 'string'],
        ]);

        return ApiResponse::success(
            $this->passwordResetService->sendResetLink($data['email'], $data['tenant_slug'] ?? null),
        );
    }

    public function resetPassword(Request $request)
    {
        $data = $request->validate([
            'email' => ['required', 'email'],
            'token' => ['required', 'string'],
            'password' => ['required', 'string', 'min:8', 'confirmed'],
            'tenant_slug' => ['nullable', 'string'],
        ]);

        return ApiResponse::success(
            $this->passwordResetService->resetPassword(
                $data['email'],
                $data['token'],
                $data['password'],
                $data['tenant_slug'] ?? null,
            ),
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

    public function updateEmail(Request $request)
    {
        $data = $request->validate([
            'email' => ['required', 'email'],
            'current_password' => ['required', 'string'],
        ]);

        return ApiResponse::success([
            'user' => $this->authService->updateEmail(
                $request->user(),
                $data['email'],
                $data['current_password'],
            ),
        ]);
    }

    public function updatePassword(Request $request)
    {
        $data = $request->validate([
            'current_password' => ['required', 'string'],
            'password' => ['required', 'string', 'min:8', 'confirmed'],
        ]);

        $this->authService->updatePassword(
            $request->user(),
            $data['current_password'],
            $data['password'],
        );

        return ApiResponse::success(['message' => 'Password updated successfully']);
    }
}
