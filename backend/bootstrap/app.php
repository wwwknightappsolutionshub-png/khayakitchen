<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        apiPrefix: 'api',
        commands: __DIR__.'/../routes/console.php',
        channels: __DIR__.'/../routes/channels.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->alias([
            'tenant.resolve' => \App\Shared\Middleware\ResolveTenant::class,
            'tenant.access' => \App\Shared\Middleware\CheckTenantAccess::class,
            'permissions.load' => \App\Shared\Middleware\LoadPermissions::class,
            'feature' => \App\Shared\Middleware\ApplyFeatureFlags::class,
            'platform.super_admin' => \App\Shared\Middleware\EnsureSuperAdmin::class,
            'platform.staff' => \App\Shared\Middleware\EnsurePlatformStaff::class,
            'customer.session' => \App\Shared\Middleware\ResolveCustomerSession::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->shouldRenderJsonWhen(
            fn (Request $request) => $request->is('api/*'),
        );

        $exceptions->render(function (\Illuminate\Validation\ValidationException $e, Request $request) {
            if ($request->is('api/*')) {
                return \App\Shared\Utils\ApiResponse::error(
                    $e->getMessage(),
                    'VALIDATION_ERROR',
                    $e->errors(),
                    422,
                );
            }
        });

        $exceptions->render(function (\Symfony\Component\HttpKernel\Exception\HttpException $e, Request $request) {
            if ($request->is('api/*')) {
                return \App\Shared\Utils\ApiResponse::error(
                    $e->getMessage() ?: 'Request failed',
                    'HTTP_ERROR',
                    null,
                    $e->getStatusCode(),
                );
            }
        });
    })->create();
