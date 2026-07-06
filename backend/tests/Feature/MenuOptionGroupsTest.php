<?php

namespace Tests\Feature;

use App\Modules\Auth\Domain\Models\Tenant;
use App\Modules\Auth\Domain\Models\User;
use App\Modules\Menu\Domain\Models\Meal;
use App\Modules\Menu\Domain\Models\MealOption;
use App\Modules\Menu\Domain\Models\OptionGroup;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class MenuOptionGroupsTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed();
    }

    private function ownerHeaders(): array
    {
        $owner = User::where('email', 'owner@khayaos.com')->firstOrFail();

        return [
            'Authorization' => 'Bearer '.$owner->createToken('test')->plainTextToken,
            'X-Tenant-Slug' => 'pilot',
        ];
    }

    public function test_owner_can_create_option_group_and_meal_option(): void
    {
        $tenant = Tenant::where('slug', 'pilot')->firstOrFail();
        $meal = Meal::where('tenant_id', $tenant->id)->firstOrFail();

        $groupResponse = $this->postJson('/api/v1/menu/option-groups', [
            'meal_id' => $meal->id,
            'name' => 'Extras',
            'type' => 'multiple',
        ], $this->ownerHeaders());

        $groupResponse->assertCreated()
            ->assertJsonPath('option_group.name', 'Extras')
            ->assertJsonPath('option_group.type', 'multiple');

        $groupId = $groupResponse->json('option_group.id');

        $optionResponse = $this->postJson('/api/v1/menu/options', [
            'option_group_id' => $groupId,
            'name' => 'Extra cheese',
            'price_delta' => 1.5,
        ], $this->ownerHeaders());

        $optionResponse->assertCreated()
            ->assertJsonPath('meal_option.name', 'Extra cheese');

        $this->assertEquals(1.5, (float) $optionResponse->json('meal_option.price_delta'));

        $this->assertDatabaseHas('option_groups', [
            'id' => $groupId,
            'meal_id' => $meal->id,
            'name' => 'Extras',
            'type' => 'multiple',
        ]);

        $this->assertDatabaseHas('meal_options', [
            'option_group_id' => $groupId,
            'name' => 'Extra cheese',
        ]);
    }

    public function test_admin_menu_includes_option_groups_and_options(): void
    {
        $tenant = Tenant::where('slug', 'pilot')->firstOrFail();

        $meal = Meal::create([
            'tenant_id' => $tenant->id,
            'name' => 'Extras Test Meal',
            'base_price' => 9.99,
            'is_active' => true,
        ]);

        $group = OptionGroup::create([
            'tenant_id' => $tenant->id,
            'meal_id' => $meal->id,
            'name' => 'Sides',
            'type' => 'multiple',
        ]);

        MealOption::create([
            'tenant_id' => $tenant->id,
            'option_group_id' => $group->id,
            'name' => 'Plantain',
            'price_delta' => 2.5,
            'is_active' => true,
        ]);

        $response = $this->getJson('/api/v1/menu/admin', $this->ownerHeaders());

        $response->assertOk();

        $meals = collect($response->json('meals'));
        $target = $meals->firstWhere('id', $meal->id);

        $this->assertNotNull($target);
        $this->assertCount(1, $target['option_groups']);
        $this->assertSame('Sides', $target['option_groups'][0]['name']);
        $this->assertCount(1, $target['option_groups'][0]['options']);
        $this->assertSame('Plantain', $target['option_groups'][0]['options'][0]['name']);
    }

    public function test_public_menu_exposes_meal_options_for_customer_add_ons(): void
    {
        $tenant = Tenant::where('slug', 'pilot')->firstOrFail();

        $meal = Meal::create([
            'tenant_id' => $tenant->id,
            'name' => 'Add-on Test Meal',
            'base_price' => 11.5,
            'is_active' => true,
        ]);

        $group = OptionGroup::create([
            'tenant_id' => $tenant->id,
            'meal_id' => $meal->id,
            'name' => 'Extras',
            'type' => 'multiple',
        ]);

        MealOption::create([
            'tenant_id' => $tenant->id,
            'option_group_id' => $group->id,
            'name' => 'Garlic bread',
            'price_delta' => 3,
            'is_active' => true,
        ]);

        $response = $this->getJson('/api/v1/menu', ['X-Tenant-Slug' => 'pilot']);

        $response->assertOk();

        $meals = collect($response->json('meals'));
        $target = $meals->firstWhere('id', $meal->id);

        $this->assertNotNull($target);
        $extrasGroup = collect($target['options'])->firstWhere('group', 'Extras');
        $this->assertNotNull($extrasGroup);
        $this->assertSame('Garlic bread', $extrasGroup['options'][0]['name']);
    }

    public function test_owner_can_delete_option_group_and_nested_options(): void
    {
        $tenant = Tenant::where('slug', 'pilot')->firstOrFail();
        $meal = Meal::where('tenant_id', $tenant->id)->firstOrFail();

        $group = OptionGroup::create([
            'tenant_id' => $tenant->id,
            'meal_id' => $meal->id,
            'name' => 'Extras',
            'type' => 'multiple',
        ]);

        $option = MealOption::create([
            'tenant_id' => $tenant->id,
            'option_group_id' => $group->id,
            'name' => 'Sauce',
            'price_delta' => 0.5,
            'is_active' => true,
        ]);

        $response = $this->deleteJson("/api/v1/menu/option-groups/{$group->id}", [], $this->ownerHeaders());

        $response->assertOk();
        $this->assertDatabaseMissing('option_groups', ['id' => $group->id]);
        $this->assertDatabaseMissing('meal_options', ['id' => $option->id]);
    }

    public function test_menu_extras_seeder_aligns_pilot_meals_with_extras_groups(): void
    {
        $this->seed(\Database\Seeders\MenuExtrasSeeder::class);

        $tenant = Tenant::where('slug', 'pilot')->firstOrFail();
        $egusi = Meal::withoutGlobalScopes()
            ->where('tenant_id', $tenant->id)
            ->where('name', 'Egusi Soup')
            ->firstOrFail();

        $extrasGroup = OptionGroup::withoutGlobalScopes()
            ->where('tenant_id', $tenant->id)
            ->where('meal_id', $egusi->id)
            ->where('name', 'Extras')
            ->first();

        $this->assertNotNull($extrasGroup);
        $this->assertSame('multiple', $extrasGroup->type);

        $optionNames = MealOption::withoutGlobalScopes()
            ->where('option_group_id', $extrasGroup->id)
            ->pluck('name')
            ->all();

        $this->assertContains('Extra goat meat', $optionNames);
        $this->assertContains('Extra stockfish', $optionNames);
    }
}
