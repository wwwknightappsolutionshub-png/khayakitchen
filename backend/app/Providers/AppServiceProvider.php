<?php

namespace App\Providers;

use App\Modules\Menu\Infrastructure\Repositories\MealRepository;
use App\Modules\Notifications\Infrastructure\WhatsApp\Contracts\WhatsAppProviderInterface;
use App\Modules\Notifications\Infrastructure\WhatsApp\Providers\DelegatingWhatsAppProvider;
use App\Modules\Orders\Infrastructure\Repositories\OrderRepository;
use App\Shared\Entitlements\FeatureAccessService;
use App\Shared\FeatureFlags\FeatureFlagService;
use App\Shared\Tenancy\TenantContext;
use App\Shared\Tenancy\TenantContextRunner;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Broadcast;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->singleton(TenantContext::class);

        $this->app->singleton(TenantContextRunner::class);

        $this->app->singleton(FeatureAccessService::class);

        $this->app->singleton(FeatureFlagService::class, function ($app) {
            return new FeatureFlagService(
                $app->make(TenantContext::class),
                $app->make(FeatureAccessService::class),
            );
        });

        $this->app->bind(WhatsAppProviderInterface::class, DelegatingWhatsAppProvider::class);

        $this->app->bind(MealRepository::class, function ($app) {
            return new MealRepository(
                $app->make(\App\Modules\Menu\Domain\Models\Meal::class),
                $app->make(TenantContext::class),
            );
        });

        $this->app->bind(OrderRepository::class, function ($app) {
            return new OrderRepository(
                $app->make(\App\Modules\Orders\Domain\Models\Order::class),
                $app->make(TenantContext::class),
            );
        });
    }

    public function boot(): void
    {
        RateLimiter::for('login', function (Request $request) {
            return Limit::perMinute(5)->by($request->ip());
        });

        RateLimiter::for('customer-orders', function (Request $request) {
            return Limit::perMinute(10)->by($request->ip());
        });

        RateLimiter::for('api', function (Request $request) {
            return Limit::perMinute(120)->by($request->user()?->id ?: $request->ip());
        });

        Broadcast::routes([
            'middleware' => ['auth:sanctum', 'tenant.resolve', 'tenant.access'],
            'prefix' => 'api',
        ]);
    }
}
