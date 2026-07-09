<?php

use App\Modules\Auth\Interfaces\Controllers\AuthController;
use App\Modules\Auth\Interfaces\Controllers\FeatureFlagController;
use App\Modules\Auth\Interfaces\Controllers\StaffUserController;
use App\Modules\CRM\Interfaces\Controllers\CustomerController;
use App\Modules\Delivery\Interfaces\Controllers\DeliveryController;
use App\Modules\Delivery\Interfaces\Controllers\DeliveryZoneController;
use App\Modules\Inventory\Interfaces\Controllers\InventoryController;
use App\Modules\Inventory\Interfaces\Controllers\RecipeController;
use App\Modules\Kitchen\Interfaces\Controllers\KitchenController;
use App\Modules\Loyalty\Interfaces\Controllers\CustomerLoyaltyController;
use App\Modules\Loyalty\Interfaces\Controllers\LoyaltyController;
use App\Modules\Menu\Interfaces\Controllers\MenuController;
use App\Modules\Notifications\Interfaces\Controllers\NotificationController;
use App\Modules\NotificationsCampaign\Interfaces\Controllers\CampaignController;
use App\Modules\NotificationsCampaign\Interfaces\Controllers\CustomerNotificationController;
use App\Modules\Orders\Interfaces\Controllers\CustomerOrderController;
use App\Modules\Orders\Interfaces\Controllers\OrderController;
use App\Modules\Platform\Interfaces\Controllers\PlatformAuditLogController;
use App\Modules\Platform\Interfaces\Controllers\PlatformDashboardController;
use App\Modules\Platform\Interfaces\Controllers\PlatformFeatureFlagController;
use App\Modules\Platform\Interfaces\Controllers\PlatformModuleController;
use App\Modules\Platform\Interfaces\Controllers\PlatformSettingsController;
use App\Modules\Platform\Interfaces\Controllers\PlatformTenantController;
use App\Modules\Platform\Interfaces\Controllers\PublicSignupController;
use App\Modules\Pricing\Interfaces\Controllers\EntitlementController;
use App\Modules\Pricing\Interfaces\Controllers\PlatformEntitlementController;
use App\Modules\Pricing\Interfaces\Controllers\PlatformFeatureController;
use App\Modules\Pricing\Interfaces\Controllers\PlatformPlanController;
use App\Modules\Pricing\Interfaces\Controllers\PlatformSubscriptionController;
use App\Modules\Pricing\Interfaces\Controllers\PublicPricingController;
use App\Modules\Realtime\Interfaces\Controllers\RealtimeController;
use App\Modules\Reporting\Interfaces\Controllers\DashboardController;
use App\Modules\RevenueRecovery\Interfaces\Controllers\RevenueRecoveryCampaignController;
use App\Modules\TenantBranding\Interfaces\Controllers\BrandingController;
use App\Modules\TenantBranding\Interfaces\Controllers\PlatformBrandingController;
use App\Modules\TenantBranding\Interfaces\Controllers\PlatformRestaurantStatusController;
use App\Modules\TenantBranding\Interfaces\Controllers\RestaurantStatusController;
use App\Modules\TenantBranding\Interfaces\Controllers\StorefrontController;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->group(function () {
    Route::post('/auth/login', [AuthController::class, 'login'])->middleware('throttle:login');
    Route::post('/auth/verify-email', [AuthController::class, 'verifyEmail'])->middleware('throttle:10,1');
    Route::post('/auth/resend-verification', [AuthController::class, 'resendVerification'])->middleware('throttle:6,1');
    Route::post('/auth/forgot-password', [AuthController::class, 'forgotPassword'])->middleware('throttle:6,1');
    Route::post('/auth/reset-password', [AuthController::class, 'resetPassword'])->middleware('throttle:10,1');
    Route::post('/signup', [PublicSignupController::class, 'store'])->middleware('throttle:10,1');
    Route::get('/pricing/plans', [PublicPricingController::class, 'index']);
    Route::get('/platform/public-config', [PlatformSettingsController::class, 'publicConfig']);

    Route::middleware(['tenant.resolve'])->group(function () {
        Route::get('/storefront', [StorefrontController::class, 'show']);
        Route::post('/storefront/revenue-recovery/campaigns/{id}/track-open', [StorefrontController::class, 'trackCampaignOpen']);
    });

    Route::middleware(['auth:sanctum'])->group(function () {
        Route::post('/auth/logout', [AuthController::class, 'logout']);
        Route::get('/auth/me', [AuthController::class, 'me']);
        Route::patch('/auth/email', [AuthController::class, 'updateEmail']);
        Route::patch('/auth/password', [AuthController::class, 'updatePassword']);
    });

    // Public customer endpoints (tenant resolved via header/subdomain)
    Route::middleware(['tenant.resolve'])->group(function () {
        Route::get('/realtime/public-config', [RealtimeController::class, 'publicConfig']);
    });

    Route::middleware(['tenant.resolve', 'tenant.access', 'feature:menu'])->group(function () {
        Route::get('/menu', [MenuController::class, 'index']);
        Route::get('/realtime/order-status/{id}', [RealtimeController::class, 'orderStatus']);
    });

    Route::middleware(['tenant.resolve', 'tenant.access', 'feature:notifications'])->group(function () {
        Route::post('/customer/notifications/preferences', [CustomerNotificationController::class, 'upsertPreferences']);
        Route::post('/customer/notifications/device-token', [CustomerNotificationController::class, 'registerDeviceToken']);
    });

    Route::middleware(['tenant.resolve', 'tenant.access', 'feature:orders', 'throttle:customer-orders'])->group(function () {
        Route::post('/customer/orders', [CustomerOrderController::class, 'store']);
        Route::get('/customer/orders', [CustomerOrderController::class, 'index']);
        Route::get('/customer/orders/{id}', [CustomerOrderController::class, 'show']);
    });

    Route::middleware(['tenant.resolve', 'tenant.access', 'feature:loyalty'])->group(function () {
        Route::get('/customer/loyalty/{customerId}', [CustomerLoyaltyController::class, 'show']);
    });

    Route::middleware(['auth:sanctum', 'tenant.resolve', 'tenant.access', 'permissions.load', 'throttle:api'])->group(function () {
        Route::middleware('feature:menu')->group(function () {
            Route::get('/menu/admin', [MenuController::class, 'adminIndex']);
            Route::post('/menu/meals', [MenuController::class, 'store']);
            Route::put('/menu/meals/{id}', [MenuController::class, 'update']);
            Route::post('/menu/meals/{id}/image', [MenuController::class, 'uploadMealImage']);
            Route::delete('/menu/meals/{id}', [MenuController::class, 'destroy']);
            Route::post('/menu/option-groups', [MenuController::class, 'storeOptionGroup']);
            Route::put('/menu/option-groups/{id}', [MenuController::class, 'updateOptionGroup']);
            Route::delete('/menu/option-groups/{id}', [MenuController::class, 'destroyOptionGroup']);
            Route::post('/menu/options', [MenuController::class, 'storeMealOption']);
            Route::put('/menu/options/{id}', [MenuController::class, 'updateMealOption']);
            Route::delete('/menu/options/{id}', [MenuController::class, 'destroyMealOption']);
        });

        Route::middleware('feature:orders')->group(function () {
            Route::get('/orders', [OrderController::class, 'index']);
            Route::get('/orders/{id}', [OrderController::class, 'show']);
            Route::post('/orders', [OrderController::class, 'store']);
            Route::patch('/orders/{id}/status', [OrderController::class, 'updateStatus']);
            Route::post('/orders/{id}/cancel', [OrderController::class, 'cancel']);
        });

        Route::middleware('feature:inventory')->group(function () {
            Route::get('/inventory', [InventoryController::class, 'index']);
            Route::post('/inventory/stock-in', [InventoryController::class, 'stockIn']);
            Route::post('/inventory/consume', [InventoryController::class, 'consume']);
            Route::post('/inventory/waste', [InventoryController::class, 'waste']);
            Route::post('/inventory/adjustment', [InventoryController::class, 'adjustment']);
            Route::get('/inventory/transactions', [InventoryController::class, 'transactions']);
            Route::post('/inventory/items', [InventoryController::class, 'storeItem']);
            Route::put('/inventory/items/{id}', [InventoryController::class, 'updateItem']);
            Route::get('/recipes', [RecipeController::class, 'index']);
            Route::post('/recipes', [RecipeController::class, 'store']);
        });

        Route::middleware('feature:crm')->group(function () {
            Route::get('/customers', [CustomerController::class, 'index']);
            Route::get('/customers/insights', [CustomerController::class, 'insights']);
            Route::get('/customers/{id}', [CustomerController::class, 'show']);
            Route::post('/customers/{id}/tags', [CustomerController::class, 'updateTags']);
        });

        Route::middleware('feature:loyalty')->group(function () {
            Route::get('/loyalty/{customer_id}', [LoyaltyController::class, 'show']);
            Route::post('/loyalty/earn', [LoyaltyController::class, 'earn']);
            Route::post('/loyalty/redeem', [LoyaltyController::class, 'redeem']);
        });

        Route::middleware('feature:dashboard')->group(function () {
            Route::get('/dashboard/kpis', [DashboardController::class, 'kpis']);
            Route::get('/dashboard/sales-trends', [DashboardController::class, 'salesTrends']);
            Route::get('/dashboard/inventory-health', [DashboardController::class, 'inventoryHealth']);
        });

        Route::middleware('feature:kitchen')->group(function () {
            Route::get('/kitchen/orders', [KitchenController::class, 'index']);
            Route::patch('/kitchen/orders/{id}', [KitchenController::class, 'update']);
        });

        Route::middleware('feature:delivery')->group(function () {
            Route::get('/delivery/zones', [DeliveryZoneController::class, 'index']);
            Route::post('/delivery/zones', [DeliveryZoneController::class, 'store']);
            Route::put('/delivery/zones/{id}', [DeliveryZoneController::class, 'update']);
            Route::delete('/delivery/zones/{id}', [DeliveryZoneController::class, 'destroy']);
            Route::post('/delivery', [DeliveryController::class, 'store']);
            Route::patch('/delivery/{id}/status', [DeliveryController::class, 'updateStatus']);
        });

        Route::middleware('feature:notifications')->group(function () {
            Route::get('/notifications', [NotificationController::class, 'index']);
            Route::patch('/notifications/{id}/read', [NotificationController::class, 'markRead']);
            Route::get('/campaigns', [CampaignController::class, 'index']);
            Route::post('/campaigns', [CampaignController::class, 'store']);
            Route::post('/campaigns/{id}/send', [CampaignController::class, 'send']);
        });

        Route::middleware('feature:revenue_recovery')->group(function () {
            Route::get('/revenue-recovery/dashboard', [RevenueRecoveryCampaignController::class, 'dashboard']);
            Route::get('/revenue-recovery/campaigns', [RevenueRecoveryCampaignController::class, 'index']);
            Route::post('/revenue-recovery/campaigns', [RevenueRecoveryCampaignController::class, 'store']);
            Route::get('/revenue-recovery/campaigns/{id}', [RevenueRecoveryCampaignController::class, 'show']);
            Route::patch('/revenue-recovery/campaigns/{id}', [RevenueRecoveryCampaignController::class, 'update']);
            Route::post('/revenue-recovery/campaigns/{id}/duplicate', [RevenueRecoveryCampaignController::class, 'duplicate']);
            Route::post('/revenue-recovery/campaigns/{id}/activate', [RevenueRecoveryCampaignController::class, 'activate']);
            Route::post('/revenue-recovery/campaigns/{id}/pause', [RevenueRecoveryCampaignController::class, 'pause']);
            Route::post('/revenue-recovery/campaigns/{id}/resume', [RevenueRecoveryCampaignController::class, 'resume']);
            Route::post('/revenue-recovery/campaigns/{id}/deactivate', [RevenueRecoveryCampaignController::class, 'deactivate']);
            Route::post('/revenue-recovery/campaigns/{id}/archive', [RevenueRecoveryCampaignController::class, 'archive']);
            Route::delete('/revenue-recovery/campaigns/{id}', [RevenueRecoveryCampaignController::class, 'destroy']);
            Route::post('/revenue-recovery/campaigns/{id}/notify', [RevenueRecoveryCampaignController::class, 'sendNotification']);
        });

        Route::get('/staff', [StaffUserController::class, 'index']);
        Route::post('/staff', [StaffUserController::class, 'store']);
        Route::put('/staff/{id}', [StaffUserController::class, 'update']);

        Route::get('/feature-flags', [FeatureFlagController::class, 'index']);
        Route::get('/entitlements', [EntitlementController::class, 'index']);
        Route::post('/entitlements/upgrade-request', [EntitlementController::class, 'requestUpgrade']);
        Route::get('/branding', [BrandingController::class, 'show']);
        Route::patch('/branding', [BrandingController::class, 'update']);
        Route::post('/branding/logo', [BrandingController::class, 'uploadLogo']);
        Route::post('/branding/banner', [BrandingController::class, 'uploadBanner']);
        Route::get('/restaurant-status', [RestaurantStatusController::class, 'show']);
        Route::patch('/restaurant-status', [RestaurantStatusController::class, 'update']);
        Route::patch('/feature-flags', [FeatureFlagController::class, 'update']);

        Route::prefix('realtime')->group(function () {
            Route::get('/config', [RealtimeController::class, 'config']);
            Route::get('/orders', [RealtimeController::class, 'orders']);
            Route::get('/dashboard-summary', [RealtimeController::class, 'dashboardSummary']);
            Route::get('/order-status/{id}', [RealtimeController::class, 'orderStatus']);
        });
    });

    // Platform (Super Admin) — isolated from tenant runtime
    Route::prefix('platform')
        ->middleware(['auth:sanctum', 'platform.super_admin', 'throttle:api'])
        ->group(function () {
            Route::get('/dashboard', [PlatformDashboardController::class, 'index']);
            Route::get('/modules', [PlatformModuleController::class, 'index']);
            Route::get('/tenants', [PlatformTenantController::class, 'index']);
            Route::post('/tenants', [PlatformTenantController::class, 'store']);
            Route::put('/tenants/{tenantId}', [PlatformTenantController::class, 'update']);
            Route::delete('/tenants/{tenantId}', [PlatformTenantController::class, 'destroy']);
            Route::get('/audit-logs', [PlatformAuditLogController::class, 'index']);
            Route::patch('/tenants/{tenantId}/restaurant-status', [PlatformRestaurantStatusController::class, 'update']);
            Route::patch('/tenants/{tenantId}/branding', [PlatformBrandingController::class, 'update']);
            Route::post('/tenants/{tenantId}/branding/logo', [PlatformBrandingController::class, 'uploadLogo']);
            Route::post('/tenants/{tenantId}/branding/banner', [PlatformBrandingController::class, 'uploadBanner']);
            Route::delete('/tenants/{tenantId}/branding', [PlatformBrandingController::class, 'clear']);
            Route::get('/feature-flags', [PlatformFeatureFlagController::class, 'index']);
            Route::patch('/feature-flags/{tenantId}', [PlatformFeatureFlagController::class, 'update']);

            Route::get('/settings', [PlatformSettingsController::class, 'show']);
            Route::patch('/settings', [PlatformSettingsController::class, 'update']);
            Route::post('/settings/logo', [PlatformSettingsController::class, 'uploadLogo']);
            Route::post('/settings/splash-image', [PlatformSettingsController::class, 'uploadSplashImage']);

            Route::prefix('pricing')->group(function () {
                Route::get('/plans', [PlatformPlanController::class, 'index']);
                Route::post('/plans', [PlatformPlanController::class, 'store']);
                Route::post('/plans/reorder', [PlatformPlanController::class, 'reorder']);
                Route::get('/plans/{id}', [PlatformPlanController::class, 'show']);
                Route::put('/plans/{id}', [PlatformPlanController::class, 'update']);
                Route::delete('/plans/{id}', [PlatformPlanController::class, 'destroy']);
                Route::post('/plans/{id}/archive', [PlatformPlanController::class, 'archive']);
                Route::post('/plans/{id}/restore', [PlatformPlanController::class, 'restore']);
                Route::post('/plans/{id}/duplicate', [PlatformPlanController::class, 'duplicate']);
                Route::patch('/plans/{id}/visibility', [PlatformPlanController::class, 'visibility']);
                Route::patch('/plans/{id}/active', [PlatformPlanController::class, 'active']);
                Route::put('/plans/{id}/features', [PlatformPlanController::class, 'syncFeatures']);
                Route::get('/features', [PlatformFeatureController::class, 'index']);
                Route::get('/features/{id}', [PlatformFeatureController::class, 'show']);
                Route::post('/features', [PlatformFeatureController::class, 'store']);
                Route::put('/features/{id}', [PlatformFeatureController::class, 'update']);
                Route::delete('/features/{id}', [PlatformFeatureController::class, 'destroy']);
                Route::post('/features/{id}/restore', [PlatformFeatureController::class, 'restore']);
                Route::get('/subscriptions', [PlatformSubscriptionController::class, 'index']);
                Route::post('/subscriptions', [PlatformSubscriptionController::class, 'assign']);
                Route::patch('/subscriptions/{tenantId}/status', [PlatformSubscriptionController::class, 'updateStatus']);
                Route::post('/override', [PlatformSubscriptionController::class, 'override']);
                Route::get('/upgrade-requests', [PlatformSubscriptionController::class, 'upgradeRequests']);
                Route::get('/tenants/{tenantId}/entitlements', [PlatformEntitlementController::class, 'show']);
                Route::post('/tenants/{tenantId}/entitlements/features', [PlatformEntitlementController::class, 'setFeatureOverride']);
                Route::post('/tenants/{tenantId}/entitlements/limits', [PlatformEntitlementController::class, 'setLimitOverride']);
                Route::post('/tenants/{tenantId}/entitlements/reset', [PlatformEntitlementController::class, 'reset']);
            });
        });
});
