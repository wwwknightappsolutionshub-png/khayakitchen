<?php

use App\Modules\Engagement\Interfaces\Controllers\CustomerEngagementController;
use App\Modules\Engagement\Interfaces\Controllers\KitchenReviewController;
use App\Modules\Engagement\Interfaces\Controllers\PlatformChatController;
use App\Modules\Engagement\Interfaces\Controllers\PlatformStaffUserController;
use App\Modules\Engagement\Interfaces\Controllers\PlatformTenantMessageController;
use App\Modules\Engagement\Interfaces\Controllers\TenantEngagementController;
use App\Modules\Auth\Interfaces\Controllers\AuthController;
use App\Modules\Auth\Interfaces\Controllers\FeatureFlagController;
use App\Modules\Auth\Interfaces\Controllers\StaffUserController;
use App\Modules\StaffPerformance\Interfaces\Controllers\StaffPerformanceController;
use App\Modules\SeasonalPromo\Interfaces\Controllers\SeasonalPromoController;
use App\Modules\Auth\Interfaces\Controllers\TenantWorkspaceController;
use App\Modules\CRM\Interfaces\Controllers\CustomerController;
use App\Modules\CRM\Interfaces\Controllers\CustomerAccountController;
use App\Modules\CRM\Interfaces\Controllers\CustomMealRequestController;
use App\Modules\Delivery\Interfaces\Controllers\DeliveryController;
use App\Modules\Delivery\Interfaces\Controllers\DeliveryZoneController;
use App\Modules\Inventory\Interfaces\Controllers\InventoryController;
use App\Modules\Inventory\Interfaces\Controllers\RecipeController;
use App\Modules\Kitchen\Interfaces\Controllers\KitchenController;
use App\Modules\Loyalty\Interfaces\Controllers\CustomerLoyaltyController;
use App\Modules\Loyalty\Interfaces\Controllers\LoyaltyController;
use App\Modules\Loyalty\Interfaces\Controllers\LoyaltyProgramController;
use App\Modules\Menu\Interfaces\Controllers\MenuController;
use App\Modules\Notifications\Interfaces\Controllers\NotificationController;
use App\Modules\Notifications\Interfaces\Controllers\PlatformWhatsAppSettingsController;
use App\Modules\Notifications\Interfaces\Controllers\TenantWhatsAppSettingsController;
use App\Modules\NotificationsCampaign\Interfaces\Controllers\CampaignController;
use App\Modules\NotificationsCampaign\Interfaces\Controllers\CustomerNotificationController;
use App\Modules\Orders\Interfaces\Controllers\CustomerOrderController;
use App\Modules\Orders\Interfaces\Controllers\OrderController;
use App\Modules\Orders\Interfaces\Controllers\PaymentAccountsController;
use App\Modules\Platform\Interfaces\Controllers\MarketingEngagementController;
use App\Modules\Platform\Interfaces\Controllers\PlatformAuditLogController;
use App\Modules\Platform\Interfaces\Controllers\PlatformDashboardController;
use App\Modules\Platform\Interfaces\Controllers\PlatformFeatureFlagController;
use App\Modules\Platform\Interfaces\Controllers\PlatformModuleController;
use App\Modules\Platform\Interfaces\Controllers\PlatformSettingsController;
use App\Modules\Platform\Interfaces\Controllers\PlatformTenantController;
use App\Modules\Platform\Interfaces\Controllers\PresenceController;
use App\Modules\Platform\Interfaces\Controllers\PublicSignupController;
use App\Modules\Pricing\Interfaces\Controllers\EntitlementController;
use App\Modules\Pricing\Interfaces\Controllers\PlatformEntitlementController;
use App\Modules\Pricing\Interfaces\Controllers\PlatformFeatureController;
use App\Modules\Pricing\Interfaces\Controllers\PlatformLeadsController;
use App\Modules\Pricing\Interfaces\Controllers\PlatformPlanController;
use App\Modules\Pricing\Interfaces\Controllers\PlatformSubscriptionController;
use App\Modules\Pricing\Interfaces\Controllers\PublicPricingController;
use App\Modules\Pricing\Interfaces\Controllers\TenantReferralController;
use App\Modules\Realtime\Interfaces\Controllers\RealtimeController;
use App\Modules\Reporting\Interfaces\Controllers\DashboardController;
use App\Modules\RevenueRecovery\Interfaces\Controllers\CustomerProximityAuthController;
use App\Modules\RevenueRecovery\Interfaces\Controllers\CustomerProximityController;
use App\Modules\RevenueRecovery\Interfaces\Controllers\PlatformRevenueRecoveryController;
use App\Modules\RevenueRecovery\Interfaces\Controllers\RevenueRecoveryCampaignController;
use App\Modules\RevenueRecovery\Interfaces\Controllers\TenantRevenueRecoverySettingsController;
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
    Route::post('/marketing/visitor-hit', [MarketingEngagementController::class, 'visitorHit'])
        ->middleware('throttle:30,1');
    Route::post('/marketing/chat', [MarketingEngagementController::class, 'chat'])
        ->middleware('throttle:20,1');

    Route::get('/storefront/pwa-manifest/{slug}', [StorefrontController::class, 'pwaManifest']);

    Route::middleware(['tenant.resolve'])->group(function () {
        Route::get('/storefront', [StorefrontController::class, 'show']);
        Route::get('/storefront/meal-share/{mealId}', [StorefrontController::class, 'mealShare']);
        Route::post('/storefront/revenue-recovery/campaigns/{id}/track-open', [StorefrontController::class, 'trackCampaignOpen']);
    });

    Route::middleware(['auth:sanctum'])->group(function () {
        Route::post('/auth/logout', [AuthController::class, 'logout']);
        Route::get('/auth/me', [AuthController::class, 'me']);
        Route::patch('/auth/email', [AuthController::class, 'updateEmail']);
        Route::patch('/auth/password', [AuthController::class, 'updatePassword']);
        Route::post('/presence/heartbeat', [PresenceController::class, 'heartbeat'])
            ->middleware('throttle:60,1');
        Route::post('/workspace/pwa-install', [PresenceController::class, 'claimStaffPwa'])
            ->middleware('throttle:10,1');
    });

    // Public customer endpoints (tenant resolved via header/subdomain)
    Route::middleware(['tenant.resolve'])->group(function () {
        Route::get('/realtime/public-config', [RealtimeController::class, 'publicConfig']);

        Route::middleware('feature:revenue_recovery')->group(function () {
            Route::post('/customer/proximity/auth/request-otp', [CustomerProximityAuthController::class, 'requestOtp'])
                ->middleware('throttle:6,1');
            Route::post('/customer/proximity/auth/verify-otp', [CustomerProximityAuthController::class, 'verifyOtp'])
                ->middleware('throttle:10,1');

            Route::middleware('customer.session')->group(function () {
                Route::post('/customer/proximity/auth/location-opt-in', [CustomerProximityAuthController::class, 'updateLocationOptIn']);
                Route::post('/customer/proximity/location', [CustomerProximityController::class, 'heartbeat']);
                Route::get('/customer/proximity/bait', [CustomerProximityController::class, 'bait']);
                Route::post('/customer/proximity/dismiss', [CustomerProximityController::class, 'dismiss']);
            });
        });
    });

    Route::middleware(['tenant.resolve', 'tenant.access', 'feature:menu'])->group(function () {
        Route::get('/menu', [MenuController::class, 'index']);
        Route::get('/realtime/order-status/{id}', [RealtimeController::class, 'orderStatus']);

        Route::post('/customer/meals/{mealId}/like', [CustomerEngagementController::class, 'toggleLike']);
        Route::get('/customer/meals/{mealId}/refer', [CustomerEngagementController::class, 'referMeal']);
        Route::post('/customer/reviews', [CustomerEngagementController::class, 'submitReview']);
        Route::post('/customer/chat/threads', [CustomerEngagementController::class, 'openChat']);
        Route::get('/customer/chat/threads/{id}', [CustomerEngagementController::class, 'showChat']);
        Route::post('/customer/chat/threads/{id}/messages', [CustomerEngagementController::class, 'postChat']);
        Route::post('/customer/chat/threads/{id}/typing', [CustomerEngagementController::class, 'setTyping']);
    });

    Route::middleware(['tenant.resolve', 'tenant.access', 'feature:notifications'])->group(function () {
        Route::post('/customer/notifications/preferences', [CustomerNotificationController::class, 'upsertPreferences']);
        Route::post('/customer/notifications/device-token', [CustomerNotificationController::class, 'registerDeviceToken']);
    });

    Route::middleware(['tenant.resolve', 'tenant.access', 'throttle:6,1'])->group(function () {
        Route::post('/customer/auth/request-otp', [CustomerAccountController::class, 'requestOtp']);
    });

    Route::middleware(['tenant.resolve', 'tenant.access', 'throttle:10,1'])->group(function () {
        Route::post('/customer/auth/verify-otp', [CustomerAccountController::class, 'verifyOtp']);
    });

    Route::middleware(['tenant.resolve', 'tenant.access', 'customer.session', 'throttle:api'])->group(function () {
        Route::post('/customer/auth/logout', [CustomerAccountController::class, 'logout']);
        Route::get('/customer/account/me', [CustomerAccountController::class, 'me']);
        Route::patch('/customer/account/me', [CustomerAccountController::class, 'updateMe']);
        Route::post('/customer/account/phone/request-otp', [CustomerAccountController::class, 'requestPhoneChange']);
        Route::post('/customer/account/phone/confirm', [CustomerAccountController::class, 'confirmPhoneChange']);
        Route::get('/customer/account/addresses', [CustomerAccountController::class, 'addresses']);
        Route::post('/customer/account/addresses', [CustomerAccountController::class, 'storeAddress']);
        Route::patch('/customer/account/addresses/{id}', [CustomerAccountController::class, 'updateAddress']);
        Route::delete('/customer/account/addresses/{id}', [CustomerAccountController::class, 'destroyAddress']);
        Route::post('/customer/loyalty/redeem', [CustomerAccountController::class, 'redeem']);
        Route::get('/customer/account/notifications', [CustomerAccountController::class, 'notificationPreferences']);
        Route::patch('/customer/account/notifications', [CustomerAccountController::class, 'updateNotificationPreferences']);
        Route::get('/customer/account/custom-meals', [CustomerAccountController::class, 'myCustomMeals']);
        Route::post('/customer/account/custom-meals', [CustomerAccountController::class, 'submitCustomMeal']);
    });

    Route::middleware(['tenant.resolve', 'tenant.access', 'feature:orders', 'throttle:customer-orders'])->group(function () {
        Route::post('/customer/orders', [CustomerOrderController::class, 'store']);
        Route::get('/customer/orders', [CustomerOrderController::class, 'index']);
        Route::get('/customer/orders/{id}', [CustomerOrderController::class, 'show']);
        Route::post('/customer/orders/{id}/payment-proof', [CustomerOrderController::class, 'uploadPaymentProof']);
    });

    Route::middleware(['tenant.resolve', 'tenant.access', 'feature:loyalty'])->group(function () {
        Route::get('/customer/loyalty/{customerId}', [CustomerLoyaltyController::class, 'show']);
        Route::post('/customer/loyalty/opt-in', [CustomerLoyaltyController::class, 'optIn']);
        Route::post('/customer/loyalty/claim-install', [CustomerLoyaltyController::class, 'claimInstall']);
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
            Route::get('/accounts', [PaymentAccountsController::class, 'index']);
            Route::post('/accounts/{orderId}/verify', [PaymentAccountsController::class, 'verify']);
            Route::get('/custom-meal-requests', [CustomMealRequestController::class, 'index']);
            Route::patch('/custom-meal-requests/{id}', [CustomMealRequestController::class, 'updateStatus']);
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
            Route::get('/customers/analytics', [CustomerController::class, 'strategicAnalytics']);
            Route::get('/customers/{id}', [CustomerController::class, 'show']);
            Route::post('/customers/{id}/tags', [CustomerController::class, 'updateTags']);
        });

        Route::middleware('feature:loyalty')->group(function () {
            Route::get('/loyalty/program', [LoyaltyProgramController::class, 'dashboard']);
            Route::patch('/loyalty/settings', [LoyaltyProgramController::class, 'updateSettings']);
            Route::post('/loyalty/packages', [LoyaltyProgramController::class, 'storePackage']);
            Route::patch('/loyalty/packages/{id}', [LoyaltyProgramController::class, 'updatePackage']);
            Route::delete('/loyalty/packages/{id}', [LoyaltyProgramController::class, 'destroyPackage']);
            Route::post('/loyalty/notify-qualified', [LoyaltyProgramController::class, 'notifyQualified']);
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
            Route::get('/revenue-recovery/settings', [TenantRevenueRecoverySettingsController::class, 'show']);
            Route::patch('/revenue-recovery/settings', [TenantRevenueRecoverySettingsController::class, 'update']);
        });

        Route::get('/staff', [StaffUserController::class, 'index']);
        Route::post('/staff', [StaffUserController::class, 'store']);
        Route::put('/staff/{id}', [StaffUserController::class, 'update']);
        Route::get('/staff-performance', [StaffPerformanceController::class, 'overview'])
            ->middleware('feature:staff_performance');

        Route::get('/feature-flags', [FeatureFlagController::class, 'index']);
        Route::get('/entitlements', [EntitlementController::class, 'index']);
        Route::post('/entitlements/upgrade-request', [EntitlementController::class, 'requestUpgrade']);
        Route::get('/referrals', [TenantReferralController::class, 'summary']);
        Route::post('/referrals/invite', [TenantReferralController::class, 'invite']);
        Route::get('/workspace', [TenantWorkspaceController::class, 'show']);
        Route::patch('/workspace', [TenantWorkspaceController::class, 'update']);
        Route::get('/workspace/whatsapp', [TenantWhatsAppSettingsController::class, 'show']);
        Route::patch('/workspace/whatsapp', [TenantWhatsAppSettingsController::class, 'update']);
        Route::get('/engagement/platform-messages', [TenantEngagementController::class, 'platformMessages']);
        Route::get('/engagement/platform-chat/threads', [TenantEngagementController::class, 'platformThreads']);
        Route::get('/engagement/customer-chat/threads', [TenantEngagementController::class, 'customerThreads']);
        Route::post('/engagement/customer-chat/threads', [TenantEngagementController::class, 'openCustomerThread']);
        Route::get('/engagement/chat/threads/{id}', [TenantEngagementController::class, 'showThread']);
        Route::post('/engagement/chat/threads/{id}/messages', [TenantEngagementController::class, 'postMessage']);
        Route::post('/engagement/chat/threads/{id}/typing', [TenantEngagementController::class, 'setTyping']);
        Route::post('/engagement/staff-device-token', [TenantEngagementController::class, 'registerDeviceToken']);
        Route::get('/engagement/reviews', [KitchenReviewController::class, 'index']);
        Route::patch('/engagement/reviews/{id}', [KitchenReviewController::class, 'moderate']);
        Route::get('/engagement/notification-badges', [TenantEngagementController::class, 'notificationBadges']);
        Route::get('/seasonal-promo', [SeasonalPromoController::class, 'show'])
            ->middleware('feature:seasonal_promo');
        Route::patch('/seasonal-promo', [SeasonalPromoController::class, 'update'])
            ->middleware('feature:seasonal_promo');
        Route::post('/seasonal-promo/image', [SeasonalPromoController::class, 'uploadImage'])
            ->middleware('feature:seasonal_promo');
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
            Route::post('/tenants/{tenantId}/poke', [PlatformTenantController::class, 'poke']);
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
            Route::post('/settings/og-image', [PlatformSettingsController::class, 'uploadOgImage']);
            Route::get('/whatsapp', [PlatformWhatsAppSettingsController::class, 'show']);
            Route::patch('/whatsapp', [PlatformWhatsAppSettingsController::class, 'update']);

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

            Route::get('/revenue-recovery/tenants', [PlatformRevenueRecoveryController::class, 'index']);
            Route::get('/revenue-recovery/tenants/{tenantId}', [PlatformRevenueRecoveryController::class, 'show']);
            Route::patch('/revenue-recovery/tenants/{tenantId}', [PlatformRevenueRecoveryController::class, 'update']);

            Route::get('/staff', [PlatformStaffUserController::class, 'index']);
            Route::post('/staff', [PlatformStaffUserController::class, 'store']);
            Route::get('/leads', [PlatformLeadsController::class, 'index']);
        });

    Route::prefix('platform')
        ->middleware(['auth:sanctum', 'platform.staff', 'throttle:api'])
        ->group(function () {
            Route::get('/messages', [PlatformTenantMessageController::class, 'index']);
            Route::post('/messages', [PlatformTenantMessageController::class, 'store']);
            Route::get('/chat/threads', [PlatformChatController::class, 'index']);
            Route::post('/chat/threads', [PlatformChatController::class, 'store']);
            Route::get('/chat/threads/{id}', [PlatformChatController::class, 'show']);
            Route::post('/chat/threads/{id}/messages', [PlatformChatController::class, 'postMessage']);
            Route::post('/chat/threads/{id}/typing', [PlatformChatController::class, 'setTyping']);
        });
});
