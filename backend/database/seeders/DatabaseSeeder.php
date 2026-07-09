<?php

namespace Database\Seeders;

use App\Modules\Auth\Domain\Models\FeatureFlag;
use App\Modules\Auth\Domain\Models\Tenant;
use App\Modules\Auth\Domain\Models\User;
use App\Modules\CRM\Domain\Models\Customer;
use App\Modules\Inventory\Domain\Models\InventoryItem;
use App\Modules\Inventory\Domain\Models\RecipeComponent;
use App\Modules\Inventory\Domain\Models\RecipeDefinition;
use App\Modules\Menu\Domain\Models\Meal;
use App\Modules\Menu\Domain\Models\MealOption;
use App\Modules\Menu\Domain\Models\OptionGroup;
use App\Modules\Platform\Domain\Models\PlatformModule;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $tenantId = (string) Str::uuid();

        $tenant = Tenant::create([
            'id' => $tenantId,
            'tenant_id' => $tenantId,
            'name' => 'Khaya Pilot Restaurant',
            'slug' => 'pilot',
            'logo_url' => null,
            'primary_color' => '#1a1a2e',
            'status' => 'active',
        ]);

        User::create([
            'tenant_id' => null,
            'name' => 'Platform Super Admin',
            'email' => 'admin@khayaos.com',
            'password' => 'password',
            'role' => 'super_admin',
            'status' => 'active',
            'email_verified_at' => now(),
        ]);

        $owner = User::create([
            'tenant_id' => $tenant->id,
            'name' => 'Pilot Owner',
            'email' => 'owner@khayaos.com',
            'password' => 'password',
            'role' => 'owner',
            'status' => 'active',
            'email_verified_at' => now(),
        ]);

        $modules = ['menu', 'orders', 'inventory', 'crm', 'loyalty', 'dashboard', 'kitchen', 'delivery', 'notifications'];
        foreach ($modules as $module) {
            FeatureFlag::create([
                'tenant_id' => $tenant->id,
                'module' => $module,
                'enabled' => true,
            ]);
        }

        FeatureFlag::create([
            'tenant_id' => $tenant->id,
            'module' => 'forecasting',
            'enabled' => false,
        ]);

        FeatureFlag::create([
            'tenant_id' => $tenant->id,
            'module' => 'notifications.whatsapp',
            'enabled' => true,
        ]);

        FeatureFlag::create([
            'tenant_id' => $tenant->id,
            'module' => 'notifications.campaigns',
            'enabled' => true,
        ]);

        $platformModules = [
            ['key' => 'auth', 'name' => 'Auth', 'status' => 'completed', 'enabled' => true, 'sort_order' => 1],
            ['key' => 'orders', 'name' => 'Orders', 'status' => 'completed', 'enabled' => true, 'sort_order' => 2],
            ['key' => 'inventory', 'name' => 'Inventory', 'status' => 'completed', 'enabled' => true, 'sort_order' => 3],
            ['key' => 'crm', 'name' => 'CRM', 'status' => 'completed', 'enabled' => true, 'sort_order' => 4],
            ['key' => 'loyalty', 'name' => 'Loyalty', 'status' => 'completed', 'enabled' => true, 'sort_order' => 5],
            ['key' => 'kitchen', 'name' => 'Kitchen', 'status' => 'completed', 'enabled' => true, 'sort_order' => 6],
            ['key' => 'menu', 'name' => 'Menu', 'status' => 'completed', 'enabled' => true, 'sort_order' => 7],
            ['key' => 'dashboard', 'name' => 'Dashboard', 'status' => 'completed', 'enabled' => true, 'sort_order' => 8],
            ['key' => 'notifications', 'name' => 'Notifications', 'status' => 'completed', 'enabled' => true, 'sort_order' => 9],
            ['key' => 'reporting', 'name' => 'Reporting', 'status' => 'coming-soon', 'enabled' => false, 'sort_order' => 10],
            ['key' => 'accounting', 'name' => 'Accounting', 'status' => 'coming-soon', 'enabled' => false, 'sort_order' => 11],
            ['key' => 'forecasting', 'name' => 'Forecasting', 'status' => 'coming-soon', 'enabled' => false, 'sort_order' => 12],
        ];

        foreach ($platformModules as $module) {
            PlatformModule::create($module);
        }

        $customer = Customer::create([
            'tenant_id' => $tenant->id,
            'name' => 'Sample Customer',
            'email' => 'customer@example.com',
            'phone' => '+1234567890',
            'created_by' => $owner->id,
            'updated_by' => $owner->id,
        ]);

        \App\Modules\NotificationsCampaign\Domain\Models\CustomerNotificationPreference::create([
            'tenant_id' => $tenant->id,
            'customer_id' => $customer->id,
            'push_enabled' => true,
            'whatsapp_enabled' => true,
            'email_enabled' => false,
        ]);

        $mealNames = [
            ['name' => 'Jollof Rice', 'price' => 12.50, 'description' => 'Classic West African jollof', 'image' => 'https://images.unsplash.com/photo-1596797038530-2c107229654b?auto=format&fit=crop&w=600&q=80'],
            ['name' => 'Egusi Soup', 'price' => 14.00, 'description' => 'Rich melon seed soup', 'image' => 'https://images.unsplash.com/photo-1547592166-23ac45744acd?auto=format&fit=crop&w=600&q=80'],
            ['name' => 'Suya Skewers', 'price' => 9.50, 'description' => 'Spicy grilled beef', 'image' => 'https://images.pexels.com/photos/36323856/pexels-photo-36323856.jpeg?auto=compress&cs=tinysrgb&w=600&h=600&fit=crop'],
            ['name' => 'Pounded Yam', 'price' => 8.00, 'description' => 'Smooth pounded yam', 'image' => 'https://images.unsplash.com/photo-1589302168068-964664d93dc0?auto=format&fit=crop&w=600&q=80'],
            ['name' => 'Fried Plantain', 'price' => 5.50, 'description' => 'Sweet fried plantain', 'image' => 'https://images.pexels.com/photos/6210449/pexels-photo-6210449.jpeg?auto=compress&cs=tinysrgb&w=600&h=600&fit=crop'],
        ];

        $meals = [];
        foreach ($mealNames as $mealData) {
            $meals[] = Meal::create([
                'tenant_id' => $tenant->id,
                'name' => $mealData['name'],
                'description' => $mealData['description'],
                'image_url' => $mealData['image'],
                'base_price' => $mealData['price'],
                'is_active' => true,
                'created_by' => $owner->id,
                'updated_by' => $owner->id,
            ]);
        }

        $mealsByName = collect($meals)->keyBy('name');

        foreach ((new MenuExtrasSeeder)->mealOptionGroups() as $mealName => $groups) {
            $meal = $mealsByName->get($mealName);
            if (! $meal) {
                continue;
            }

            foreach ($groups as $groupData) {
                $group = OptionGroup::create([
                    'tenant_id' => $tenant->id,
                    'meal_id' => $meal->id,
                    'name' => $groupData['name'],
                    'type' => $groupData['type'],
                ]);

                foreach ($groupData['options'] as $option) {
                    MealOption::create([
                        'tenant_id' => $tenant->id,
                        'option_group_id' => $group->id,
                        'name' => $option['name'],
                        'price_delta' => $option['price_delta'],
                        'is_active' => true,
                    ]);
                }
            }
        }

        $inventoryItems = [];
        $inventoryData = [
            ['name' => 'Rice', 'unit' => 'kg', 'stock' => 50, 'reorder' => 10, 'cost' => 2.50],
            ['name' => 'Chicken', 'unit' => 'kg', 'stock' => 20, 'reorder' => 5, 'cost' => 8.00],
            ['name' => 'Tomatoes', 'unit' => 'kg', 'stock' => 15, 'reorder' => 3, 'cost' => 3.00],
            ['name' => 'Palm Oil', 'unit' => 'liter', 'stock' => 10, 'reorder' => 2, 'cost' => 5.00],
            ['name' => 'Plantain', 'unit' => 'unit', 'stock' => 100, 'reorder' => 20, 'cost' => 0.50],
        ];

        foreach ($inventoryData as $item) {
            $inventoryItems[] = InventoryItem::create([
                'tenant_id' => $tenant->id,
                'name' => $item['name'],
                'unit' => $item['unit'],
                'current_stock' => $item['stock'],
                'reorder_level' => $item['reorder'],
                'cost_per_unit' => $item['cost'],
                'created_by' => $owner->id,
                'updated_by' => $owner->id,
            ]);
        }

        $recipe = RecipeDefinition::create([
            'tenant_id' => $tenant->id,
            'meal_id' => $meals[0]->id,
            'portion_size' => 'medium',
            'created_at' => now(),
        ]);

        RecipeComponent::create([
            'tenant_id' => $tenant->id,
            'recipe_id' => $recipe->id,
            'inventory_item_id' => $inventoryItems[0]->id,
            'quantity' => 0.25,
        ]);

        RecipeComponent::create([
            'tenant_id' => $tenant->id,
            'recipe_id' => $recipe->id,
            'inventory_item_id' => $inventoryItems[1]->id,
            'quantity' => 0.15,
        ]);

        RecipeComponent::create([
            'tenant_id' => $tenant->id,
            'recipe_id' => $recipe->id,
            'inventory_item_id' => $inventoryItems[2]->id,
            'quantity' => 0.1,
        ]);

        $this->call(PricingSeeder::class);

        \App\Modules\TenantBranding\Domain\Models\TenantBranding::create([
            'tenant_id' => $tenant->id,
            'restaurant_name' => 'Khaya Kitchen',
            'logo_url' => null,
            'primary_color' => '#E07A5F',
            'secondary_color' => '#81B29A',
        ]);

        \App\Modules\TenantBranding\Domain\Models\RestaurantStatus::create([
            'tenant_id' => $tenant->id,
            'status' => 'open',
            'is_accepting_orders' => true,
            'promo_alerts_enabled' => true,
        ]);
    }
}
