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
            ['key' => 'orders', 'name' => 'Orders', 'category' => 'orders', 'description' => 'Order management'],
            ['key' => 'menu_management', 'name' => 'Menu Management', 'category' => 'orders', 'description' => 'Menu CRUD'],
            ['key' => 'inventory_tracking', 'name' => 'Inventory Tracking', 'category' => 'inventory', 'description' => 'Stock and recipes'],
            ['key' => 'crm_basic', 'name' => 'CRM Basic', 'category' => 'crm', 'description' => 'Customer profiles'],
            ['key' => 'loyalty_system', 'name' => 'Loyalty System', 'category' => 'crm', 'description' => 'Points and rewards'],
            ['key' => 'whatsapp_notifications', 'name' => 'WhatsApp Notifications', 'category' => 'marketing', 'description' => 'WhatsApp order updates'],
            ['key' => 'pwa_push_notifications', 'name' => 'PWA Push', 'category' => 'marketing', 'description' => 'Web push notifications'],
            ['key' => 'notification_campaigns', 'name' => 'Notification Campaigns', 'category' => 'marketing', 'description' => 'Marketing campaigns'],
            ['key' => 'analytics_basic', 'name' => 'Analytics Basic', 'category' => 'orders', 'description' => 'Dashboard KPIs'],
            ['key' => 'super_admin_override', 'name' => 'Super Admin Override', 'category' => 'orders', 'description' => 'Platform override capability'],
        ];

        foreach ($features as $feature) {
            Feature::firstOrCreate(['key' => $feature['key']], $feature);
        }

        $starter = Plan::firstOrCreate(['name' => 'Starter'], [
            'price_monthly' => 29,
            'price_yearly' => 290,
            'is_active' => true,
            'is_visible' => true,
            'max_menu_items' => 25,
            'max_orders_per_day' => 100,
            'max_customers' => 200,
        ]);

        $growth = Plan::firstOrCreate(['name' => 'Growth'], [
            'price_monthly' => 79,
            'price_yearly' => 790,
            'is_active' => true,
            'is_visible' => true,
            'max_menu_items' => 100,
            'max_orders_per_day' => 500,
            'max_customers' => 2000,
        ]);

        $pro = Plan::firstOrCreate(['name' => 'Pro'], [
            'price_monthly' => 149,
            'price_yearly' => 1490,
            'is_active' => true,
            'is_visible' => false,
            'max_menu_items' => 500,
            'max_orders_per_day' => 5000,
            'max_customers' => 10000,
        ]);

        $allFeatures = Feature::all()->keyBy('key');

        $starterKeys = ['orders', 'menu_management', 'crm_basic', 'analytics_basic'];
        $growthKeys = array_merge($starterKeys, [
            'inventory_tracking', 'loyalty_system', 'whatsapp_notifications', 'pwa_push_notifications',
            'notification_campaigns',
        ]);
        $proKeys = array_merge($growthKeys, ['notification_campaigns', 'super_admin_override']);

        $this->syncPlan($starter, $allFeatures, $starterKeys);
        $this->syncPlan($growth, $allFeatures, $growthKeys);
        $this->syncPlan($pro, $allFeatures, $proKeys);

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
