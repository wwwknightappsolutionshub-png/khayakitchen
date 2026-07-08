<?php

namespace Database\Seeders;

use App\Modules\Auth\Domain\Models\Tenant;
use App\Modules\Pricing\Application\Services\PlanService;
use App\Modules\Pricing\Application\Services\SubscriptionService;
use App\Modules\Pricing\Domain\Models\Feature;
use App\Modules\Pricing\Domain\Models\Plan;
use Illuminate\Database\Seeder;

class PricingSeeder extends Seeder
{
    public function run(): void
    {
        $features = [
            ['key' => 'orders', 'name' => 'Orders', 'category' => 'orders', 'module' => 'orders', 'description' => 'Order management'],
            ['key' => 'menu_management', 'name' => 'Menu Management', 'category' => 'orders', 'module' => 'menu', 'description' => 'Menu CRUD'],
            ['key' => 'inventory_tracking', 'name' => 'Inventory', 'category' => 'inventory', 'module' => 'inventory', 'description' => 'Stock and recipes'],
            ['key' => 'crm_basic', 'name' => 'CRM', 'category' => 'crm', 'module' => 'crm', 'description' => 'Customer profiles'],
            ['key' => 'loyalty_system', 'name' => 'Loyalty', 'category' => 'crm', 'module' => 'loyalty', 'description' => 'Points and rewards'],
            ['key' => 'whatsapp_notifications', 'name' => 'WhatsApp', 'category' => 'marketing', 'module' => 'notifications.whatsapp', 'description' => 'WhatsApp order updates'],
            ['key' => 'pwa_push_notifications', 'name' => 'Push Notifications', 'category' => 'marketing', 'module' => 'notifications', 'description' => 'Web push notifications'],
            ['key' => 'notification_campaigns', 'name' => 'Campaigns', 'category' => 'marketing', 'module' => 'notifications.campaigns', 'description' => 'Marketing campaigns'],
            ['key' => 'revenue_recovery', 'name' => 'Revenue Recovery', 'category' => 'marketing', 'module' => 'revenue_recovery', 'description' => 'Time-limited recovery campaigns'],
            ['key' => 'analytics_basic', 'name' => 'Analytics', 'category' => 'reporting', 'module' => 'dashboard', 'description' => 'Dashboard KPIs'],
            ['key' => 'reports', 'name' => 'Reports', 'category' => 'reporting', 'module' => 'reporting', 'description' => 'Operational reports'],
            ['key' => 'delivery', 'name' => 'Delivery', 'category' => 'operations', 'module' => 'delivery', 'description' => 'Delivery zones and drivers'],
            ['key' => 'pickup', 'name' => 'Pickup', 'category' => 'operations', 'module' => 'pickup', 'description' => 'Pickup orders'],
            ['key' => 'coupons', 'name' => 'Coupons', 'category' => 'marketing', 'module' => 'coupons', 'description' => 'Discount coupons'],
            ['key' => 'accounting', 'name' => 'Accounting', 'category' => 'finance', 'module' => 'accounting', 'description' => 'Accounting integration'],
            ['key' => 'forecasting', 'name' => 'Forecasting', 'category' => 'finance', 'module' => 'forecasting', 'description' => 'Demand forecasting'],
            ['key' => 'api_access', 'name' => 'API Access', 'category' => 'platform', 'module' => 'api', 'description' => 'Developer API access'],
            ['key' => 'marketplace', 'name' => 'Marketplace', 'category' => 'platform', 'module' => 'marketplace', 'description' => 'Marketplace integrations'],
            ['key' => 'white_label', 'name' => 'White Label', 'category' => 'platform', 'module' => 'white_label', 'description' => 'White-label branding'],
            ['key' => 'ai', 'name' => 'AI Assistant', 'category' => 'platform', 'module' => 'ai', 'description' => 'AI-powered insights'],
            ['key' => 'super_admin_override', 'name' => 'Super Admin Override', 'category' => 'platform', 'module' => 'platform', 'description' => 'Platform override capability'],
        ];

        foreach ($features as $feature) {
            Feature::firstOrCreate(['key' => $feature['key']], $feature);
        }

        $starter = Plan::firstOrCreate(['slug' => 'starter'], [
            'name' => 'Starter',
            'description' => 'Perfect for new kitchens getting online',
            'price_monthly' => 29,
            'price_yearly' => 290,
            'currency' => 'GBP',
            'cta_text' => 'Start with Starter',
            'plan_color' => '#E07A5F',
            'is_active' => true,
            'is_visible' => true,
            'is_recommended' => false,
            'display_order' => 1,
            'max_menu_items' => 5,
            'max_orders_per_day' => 100,
            'max_customers' => 200,
            'max_categories' => 5,
            'max_staff' => 2,
            'max_campaigns_per_month' => 2,
            'max_push_notifications_per_month' => 200,
            'max_storage_mb' => 100,
            'max_images' => 10,
            'max_branches' => 1,
            'max_drivers' => 1,
            'max_products' => 5,
            'max_loyalty_members' => 100,
            'max_active_promotions' => 1,
            'max_delivery_zones' => 1,
            'marketing_features' => ['Online ordering', 'Basic menu', 'Customer CRM'],
        ]);

        $growth = Plan::firstOrCreate(['slug' => 'growth'], [
            'name' => 'Growth',
            'description' => 'Scale your kitchen with marketing and loyalty',
            'price_monthly' => 79,
            'price_yearly' => 790,
            'currency' => 'GBP',
            'cta_text' => 'Upgrade to Growth',
            'plan_color' => '#E07A5F',
            'is_active' => true,
            'is_visible' => true,
            'is_recommended' => true,
            'display_order' => 2,
            'max_menu_items' => 100,
            'max_orders_per_day' => 500,
            'max_customers' => 2000,
            'max_categories' => 25,
            'max_staff' => 10,
            'max_campaigns_per_month' => 20,
            'max_push_notifications_per_month' => 5000,
            'max_storage_mb' => 500,
            'max_images' => 100,
            'max_branches' => 3,
            'max_drivers' => 10,
            'max_products' => 100,
            'max_loyalty_members' => 2000,
            'max_active_promotions' => 5,
            'max_delivery_zones' => 10,
            'marketing_features' => ['Everything in Starter', 'Loyalty', 'Campaigns', 'WhatsApp alerts'],
        ]);

        $professional = Plan::firstOrCreate(['slug' => 'professional'], [
            'name' => 'Professional',
            'description' => 'Advanced operations for busy restaurants',
            'price_monthly' => 149,
            'price_yearly' => 1490,
            'currency' => 'GBP',
            'cta_text' => 'Go Professional',
            'plan_color' => '#E07A5F',
            'is_active' => true,
            'is_visible' => true,
            'is_recommended' => false,
            'display_order' => 3,
            'max_menu_items' => 500,
            'max_orders_per_day' => 5000,
            'max_customers' => 10000,
            'max_categories' => 100,
            'max_staff' => 50,
            'max_campaigns_per_month' => 100,
            'max_push_notifications_per_month' => 50000,
            'max_storage_mb' => 5000,
            'max_images' => 500,
            'max_branches' => 10,
            'max_drivers' => 50,
            'max_products' => 500,
            'max_loyalty_members' => 10000,
            'max_active_promotions' => 20,
            'max_delivery_zones' => 50,
            'marketing_features' => ['Everything in Growth', 'Inventory', 'Reports', 'Delivery zones'],
        ]);

        $enterprise = Plan::firstOrCreate(['slug' => 'enterprise'], [
            'name' => 'Enterprise',
            'description' => 'Unlimited scale with white-label and API access',
            'price_monthly' => 299,
            'price_yearly' => 2990,
            'currency' => 'GBP',
            'cta_text' => 'Contact Sales',
            'plan_color' => '#E07A5F',
            'is_active' => true,
            'is_visible' => true,
            'is_recommended' => false,
            'display_order' => 4,
            'max_menu_items' => 10000,
            'max_orders_per_day' => 50000,
            'max_customers' => 100000,
            'unlimited_flags' => [
                'max_menu_items' => false,
                'max_categories' => true,
                'max_staff' => true,
            ],
            'marketing_features' => ['Everything in Professional', 'API access', 'White label', 'Dedicated support'],
        ]);

        $allFeatures = Feature::all()->keyBy('key');

        $starterKeys = ['orders', 'menu_management', 'crm_basic', 'analytics_basic', 'pickup'];
        $growthKeys = array_merge($starterKeys, [
            'inventory_tracking', 'loyalty_system', 'whatsapp_notifications', 'pwa_push_notifications',
            'notification_campaigns', 'revenue_recovery', 'delivery', 'coupons',
        ]);
        $professionalKeys = array_merge($growthKeys, ['reports', 'forecasting']);
        $enterpriseKeys = array_merge($professionalKeys, ['accounting', 'api_access', 'marketplace', 'white_label', 'ai']);

        $this->syncPlan($starter, $allFeatures, $starterKeys);
        $this->syncPlan($growth, $allFeatures, $growthKeys);
        $this->syncPlan($professional, $allFeatures, $professionalKeys);
        $this->syncPlan($enterprise, $allFeatures, $enterpriseKeys);

        $tenant = Tenant::where('slug', 'pilot')->first();
        if ($tenant) {
            app(SubscriptionService::class)->assignPlan($tenant->id, $growth->id, 'active');
        }
    }

    /**
     * @param  \Illuminate\Support\Collection<string, Feature>  $allFeatures
     * @param  list<string>  $enabledKeys
     */
    private function syncPlan(Plan $plan, $allFeatures, array $enabledKeys): void
    {
        $map = [];
        foreach ($allFeatures as $key => $feature) {
            $map[$feature->id] = in_array($key, $enabledKeys, true);
        }

        app(PlanService::class)->syncPlanFeatures($plan->id, $map, null);
    }
}
