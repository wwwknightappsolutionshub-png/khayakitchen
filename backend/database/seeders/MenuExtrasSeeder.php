<?php

namespace Database\Seeders;

use App\Modules\Auth\Domain\Models\Tenant;
use App\Modules\Menu\Domain\Models\Meal;
use App\Modules\Menu\Domain\Models\MealOption;
use App\Modules\Menu\Domain\Models\OptionGroup;
use Illuminate\Database\Seeder;

class MenuExtrasSeeder extends Seeder
{
    /**
     * Pilot meal extras aligned with DatabaseSeeder main menu items.
     * Idempotent — skips groups that already exist by meal + group name.
     */
    public function run(): void
    {
        $tenant = Tenant::where('slug', 'pilot')->first();
        if (! $tenant) {
            return;
        }

        $mealsByName = Meal::withoutGlobalScopes()
            ->where('tenant_id', $tenant->id)
            ->get()
            ->keyBy('name');

        foreach ($this->mealOptionGroups() as $mealName => $groups) {
            $meal = $mealsByName->get($mealName);
            if (! $meal) {
                continue;
            }

            foreach ($groups as $groupData) {
                $existingGroup = OptionGroup::withoutGlobalScopes()
                    ->where('tenant_id', $tenant->id)
                    ->where('meal_id', $meal->id)
                    ->where('name', $groupData['name'])
                    ->first();

                if ($existingGroup) {
                    continue;
                }

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
    }

    /**
     * @return array<string, list<array{name: string, type: string, options: list<array{name: string, price_delta: float}>}>>
     */
    public function mealOptionGroups(): array
    {
        return [
            'Jollof Rice' => [
                [
                    'name' => 'Protein',
                    'type' => 'single',
                    'options' => [
                        ['name' => 'Chicken', 'price_delta' => 0],
                        ['name' => 'Goat', 'price_delta' => 1.50],
                        ['name' => 'Fish', 'price_delta' => 3.00],
                    ],
                ],
                [
                    'name' => 'Extras',
                    'type' => 'multiple',
                    'options' => [
                        ['name' => 'Extra stew', 'price_delta' => 2.00],
                        ['name' => 'Fried plantain side', 'price_delta' => 3.50],
                        ['name' => 'Coleslaw', 'price_delta' => 1.50],
                    ],
                ],
            ],
            'Egusi Soup' => [
                [
                    'name' => 'Swallow',
                    'type' => 'single',
                    'options' => [
                        ['name' => 'Pounded yam', 'price_delta' => 0],
                        ['name' => 'Eba', 'price_delta' => 0],
                        ['name' => 'Fufu', 'price_delta' => 0.50],
                    ],
                ],
                [
                    'name' => 'Extras',
                    'type' => 'multiple',
                    'options' => [
                        ['name' => 'Extra goat meat', 'price_delta' => 4.00],
                        ['name' => 'Extra stockfish', 'price_delta' => 3.00],
                        ['name' => 'Extra spinach', 'price_delta' => 1.00],
                    ],
                ],
            ],
            'Suya Skewers' => [
                [
                    'name' => 'Portion',
                    'type' => 'single',
                    'options' => [
                        ['name' => '3 skewers', 'price_delta' => 0],
                        ['name' => '5 skewers', 'price_delta' => 4.00],
                        ['name' => '8 skewers', 'price_delta' => 8.50],
                    ],
                ],
                [
                    'name' => 'Extras',
                    'type' => 'multiple',
                    'options' => [
                        ['name' => 'Yaji pepper dip', 'price_delta' => 0.50],
                        ['name' => 'Onions & tomatoes', 'price_delta' => 1.00],
                        ['name' => 'Extra suya spice', 'price_delta' => 0.75],
                    ],
                ],
            ],
            'Pounded Yam' => [
                [
                    'name' => 'Soup pairing',
                    'type' => 'single',
                    'options' => [
                        ['name' => 'Egusi', 'price_delta' => 0],
                        ['name' => 'Vegetable soup', 'price_delta' => 1.00],
                        ['name' => 'Efo riro', 'price_delta' => 2.00],
                    ],
                ],
                [
                    'name' => 'Extras',
                    'type' => 'multiple',
                    'options' => [
                        ['name' => 'Extra portion', 'price_delta' => 3.00],
                        ['name' => 'Assorted meat', 'price_delta' => 4.50],
                        ['name' => 'Goat meat', 'price_delta' => 3.50],
                    ],
                ],
            ],
            'Fried Plantain' => [
                [
                    'name' => 'Extras',
                    'type' => 'multiple',
                    'options' => [
                        ['name' => 'Honey drizzle', 'price_delta' => 0.75],
                        ['name' => 'Pepper sauce', 'price_delta' => 0.50],
                        ['name' => 'Extra plantain', 'price_delta' => 2.50],
                    ],
                ],
            ],
        ];
    }
}
