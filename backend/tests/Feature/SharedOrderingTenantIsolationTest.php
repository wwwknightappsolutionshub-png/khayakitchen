<?php

namespace Tests\Feature;

use App\Modules\Auth\Domain\Models\Tenant;
use App\Modules\Auth\Domain\Models\User;
use App\Modules\Menu\Domain\Models\Meal;
use App\Modules\Pricing\Domain\Models\Feature;
use App\Modules\Pricing\Domain\Models\Plan;
use App\Shared\Entitlements\FeatureAccessService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SharedOrderingTenantIsolationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed();
    }

    private function enableFeature(string $tenantId, string $featureKey): void
    {
        $feature = Feature::where('key', $featureKey)->firstOrFail();
        $plan = Plan::where('slug', 'growth')->firstOrFail();
        if ($plan->features()->where('features.id', $feature->id)->exists()) {
            $plan->features()->updateExistingPivot($feature->id, ['enabled' => true]);
        } else {
            $plan->features()->attach($feature->id, ['enabled' => true]);
        }
        app(FeatureAccessService::class)->clearCache($tenantId);
    }

    public function test_authenticated_owner_storefront_and_menu_follow_shared_slug(): void
    {
        $owner = User::where('email', 'owner@khayaos.com')->firstOrFail();
        $pilot = Tenant::where('slug', 'pilot')->firstOrFail();

        $other = Tenant::create([
            'name' => 'Shared Link Kitchen',
            'slug' => 'shared-link-kitchen',
            'status' => 'active',
            'currency' => 'GBP',
            'ui_theme' => 'light',
        ]);

        // Put the other kitchen on Growth so menu feature resolves.
        app(\App\Modules\Pricing\Application\Services\SubscriptionService::class)
            ->assignPlan($other->id, Plan::where('slug', 'growth')->firstOrFail()->id, 'active');
        $this->enableFeature($other->id, 'menu_management');
        $this->enableFeature($other->id, 'orders');

        Meal::create([
            'tenant_id' => $other->id,
            'name' => 'Shared Jollof',
            'description' => 'From shared link',
            'base_price' => 12.5,
            'is_active' => true,
        ]);

        $this->assertSame($pilot->id, $owner->tenant_id);
        $token = $owner->createToken('test')->plainTextToken;

        $storefront = $this->withHeaders([
            'Authorization' => "Bearer {$token}",
            'X-Tenant-Slug' => 'shared-link-kitchen',
        ])->getJson('/api/v1/storefront');

        $this->assertTrue(
            $storefront->status() === 200,
            'Unexpected storefront response: '.$storefront->status().' '.json_encode($storefront->json()),
        );
        $storefront->assertJsonPath('workspace.slug', 'shared-link-kitchen');

        $menu = $this->withHeaders([
            'Authorization' => "Bearer {$token}",
            'X-Tenant-Slug' => 'shared-link-kitchen',
        ])->getJson('/api/v1/menu');

        $this->assertTrue(
            $menu->status() === 200,
            'Unexpected menu response: '.$menu->status().' '.json_encode($menu->json()),
        );
        $names = collect($menu->json('meals'))->pluck('name');
        $this->assertTrue($names->contains('Shared Jollof'));
    }
}
