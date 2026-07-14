<?php

namespace Tests\Feature;

use App\Modules\Auth\Domain\Models\User;
use App\Modules\Menu\Domain\Models\Meal;
use App\Modules\Pricing\Domain\Models\Feature;
use App\Modules\SeasonalPromo\Domain\Models\SeasonalPromo;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SeasonalPromoAndBadgesTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed();
    }

    public function test_seasonal_promo_is_in_feature_library_with_implemented_at(): void
    {
        $admin = User::where('email', 'admin@khayaos.com')->firstOrFail();
        $token = $admin->createToken('t')->plainTextToken;

        $catalog = $this->getJson('/api/v1/platform/pricing/features?grouped=0', [
            'Authorization' => "Bearer {$token}",
        ]);
        $catalog->assertOk();
        $row = collect($catalog->json('features'))->firstWhere('key', 'seasonal_promo');
        $this->assertNotNull($row);
        $this->assertStringStartsWith('2026-07-14', (string) $row['implemented_at']);
        $this->assertDatabaseHas('features', ['key' => 'seasonal_promo', 'module' => 'seasonal_promo']);
    }

    public function test_owner_can_publish_seasonal_promo_and_storefront_exposes_it(): void
    {
        $owner = User::where('email', 'owner@khayaos.com')->firstOrFail();
        $this->actingAs($owner, 'sanctum');
        $meal = Meal::firstOrFail();

        $update = $this->patchJson('/api/v1/seasonal-promo', [
            'headline' => 'Weekend Special',
            'subheadline' => 'Limited tray',
            'details' => 'Fresh from the kitchen this weekend only.',
            'cta_label' => 'See on menu',
            'meal_id' => $meal->id,
            'is_published' => true,
        ], ['X-Tenant-Slug' => 'pilot']);

        $update->assertOk();
        $this->assertDatabaseHas('seasonal_promos', [
            'tenant_id' => $owner->tenant_id,
            'is_published' => true,
            'meal_id' => $meal->id,
        ]);

        $storefront = $this->getJson('/api/v1/storefront', ['X-Tenant-Slug' => 'pilot']);
        $storefront->assertOk();
        $this->assertSame('Weekend Special', $storefront->json('seasonal_promo.headline'));
        $this->assertSame('#meal-'.$meal->id, $storefront->json('seasonal_promo.menu_hash'));
    }

    public function test_notification_badges_count_pending_reviews_and_unread_chat(): void
    {
        $owner = User::where('email', 'owner@khayaos.com')->firstOrFail();
        $tenant = \App\Modules\Auth\Domain\Models\Tenant::where('slug', 'pilot')->firstOrFail();
        Feature::where('key', 'tenant_customer_chat')->first();
        app(\App\Shared\Entitlements\FeatureAccessService::class)->clearCache($tenant->id);

        $this->actingAs($owner, 'sanctum');
        $badges = $this->getJson('/api/v1/engagement/notification-badges', [
            'X-Tenant-Slug' => 'pilot',
        ]);
        $badges->assertOk();
        $this->assertArrayHasKey('unread_customer_messages', $badges->json());
        $this->assertArrayHasKey('pending_reviews', $badges->json());
    }
}
