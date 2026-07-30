<?php

namespace Tests\Feature;

use App\Modules\Auth\Domain\Models\Tenant;
use App\Modules\Auth\Domain\Models\User;
use App\Modules\Menu\Domain\Models\Meal;
use App\Modules\RevenueRecovery\Domain\Models\RevenueRecoveryCampaign;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class RevenueRecoveryTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed();
    }

    /**
     * @return array{token: string, tenant: Tenant}
     */
    private function ownerContext(): array
    {
        $owner = User::where('email', 'owner@khayaos.com')->firstOrFail();

        return [
            'token' => $owner->createToken('test')->plainTextToken,
            'tenant' => Tenant::where('slug', 'pilot')->firstOrFail(),
        ];
    }

    public function test_owner_can_create_activate_and_apply_recovery_campaign_discount(): void
    {
        ['token' => $token, 'tenant' => $tenant] = $this->ownerContext();
        $meal = Meal::where('tenant_id', $tenant->id)->firstOrFail();
        $basePrice = (float) $meal->base_price;

        $create = $this->postJson('/api/v1/revenue-recovery/campaigns', [
            'name' => 'Slow Tuesday',
            'campaign_type' => 'slow_period',
            'discount_type' => 'percent',
            'discount_value' => 20,
            'meal_ids' => [$meal->id],
            'starts_at' => now()->addMinute()->toIso8601String(),
            'ends_at' => now()->addHours(2)->toIso8601String(),
            'notifications_enabled' => false,
            'target_audience' => 'all',
        ], [
            'Authorization' => "Bearer {$token}",
            'X-Tenant-Slug' => $tenant->slug,
        ]);

        $create->assertCreated();
        $campaignId = $create->json('campaign.id');
        $this->assertNotEmpty($campaignId);

        $activate = $this->postJson("/api/v1/revenue-recovery/campaigns/{$campaignId}/activate", [], [
            'Authorization' => "Bearer {$token}",
            'X-Tenant-Slug' => $tenant->slug,
        ]);

        $activate->assertOk();

        RevenueRecoveryCampaign::withoutGlobalScopes()
            ->where('id', $campaignId)
            ->update([
                'status' => RevenueRecoveryCampaign::STATUS_ACTIVE,
                'starts_at' => now()->subMinute(),
            ]);

        $storefront = $this->getJson('/api/v1/storefront', [
            'X-Tenant-Slug' => $tenant->slug,
        ]);

        $storefront->assertOk();
        $offers = $storefront->json('revenue_recovery.offers');
        $this->assertNotEmpty($offers);
        $this->assertSame($meal->id, $offers[0]['meal_id']);

        $expectedTotal = round($basePrice * 0.8, 2);

        $order = $this->postJson('/api/v1/customer/orders', [
            'name' => 'Recovery Customer',
            'phone' => '+2348099990001',
            'order_type' => 'pickup',
            'payment_method' => 'card',
            'items' => [
                [
                    'meal_id' => $meal->id,
                    'quantity' => 1,
                    'options' => [],
                ],
            ],
        ], [
            'X-Tenant-Slug' => $tenant->slug,
        ]);

        $order->assertCreated();
        $this->assertEquals($expectedTotal, (float) $order->json('total'));

        $this->assertDatabaseHas('orders', [
            'tenant_id' => $tenant->id,
            'revenue_recovery_campaign_id' => $campaignId,
            'discount_total' => round($basePrice * 0.2, 2),
        ]);
    }

    public function test_owner_can_duplicate_campaign(): void
    {
        ['token' => $token, 'tenant' => $tenant] = $this->ownerContext();
        $meal = Meal::where('tenant_id', $tenant->id)->firstOrFail();

        $create = $this->postJson('/api/v1/revenue-recovery/campaigns', [
            'name' => 'Happy Hour',
            'campaign_type' => 'happy_hour',
            'discount_type' => 'percent',
            'discount_value' => 10,
            'meal_ids' => [$meal->id],
            'starts_at' => now()->addHour()->toIso8601String(),
            'ends_at' => now()->addHours(3)->toIso8601String(),
            'notifications_enabled' => false,
        ], [
            'Authorization' => "Bearer {$token}",
            'X-Tenant-Slug' => $tenant->slug,
        ]);

        $create->assertCreated();
        $campaignId = $create->json('campaign.id');

        $duplicate = $this->postJson("/api/v1/revenue-recovery/campaigns/{$campaignId}/duplicate", [], [
            'Authorization' => "Bearer {$token}",
            'X-Tenant-Slug' => $tenant->slug,
        ]);

        $duplicate->assertCreated();
        $duplicate->assertJsonPath('campaign.status', 'draft');
        $this->assertStringContainsString('Copy', $duplicate->json('campaign.name'));
    }

    public function test_track_open_increments_notification_opens(): void
    {
        ['token' => $token, 'tenant' => $tenant] = $this->ownerContext();
        $meal = Meal::where('tenant_id', $tenant->id)->firstOrFail();

        $create = $this->postJson('/api/v1/revenue-recovery/campaigns', [
            'name' => 'Track Open Test',
            'campaign_type' => 'custom',
            'discount_type' => 'percent',
            'discount_value' => 10,
            'meal_ids' => [$meal->id],
            'starts_at' => now()->addMinute()->toIso8601String(),
            'ends_at' => now()->addHours(2)->toIso8601String(),
            'notifications_enabled' => false,
        ], [
            'Authorization' => "Bearer {$token}",
            'X-Tenant-Slug' => $tenant->slug,
        ]);

        $campaignId = $create->json('campaign.id');

        RevenueRecoveryCampaign::withoutGlobalScopes()
            ->where('id', $campaignId)
            ->update([
                'status' => RevenueRecoveryCampaign::STATUS_ACTIVE,
                'starts_at' => now()->subMinute(),
            ]);

        $track = $this->postJson("/api/v1/storefront/revenue-recovery/campaigns/{$campaignId}/track-open", [], [
            'X-Tenant-Slug' => $tenant->slug,
        ]);

        $track->assertOk();
        $track->assertJsonPath('recorded', true);

        $this->assertDatabaseHas('revenue_recovery_campaigns', [
            'id' => $campaignId,
            'notifications_opened' => 1,
        ]);
    }

    public function test_order_metrics_count_orders_and_discounted_items(): void
    {
        ['token' => $token, 'tenant' => $tenant] = $this->ownerContext();
        $meal = Meal::where('tenant_id', $tenant->id)->firstOrFail();

        $create = $this->postJson('/api/v1/revenue-recovery/campaigns', [
            'name' => 'Metrics Test',
            'campaign_type' => 'slow_period',
            'discount_type' => 'percent',
            'discount_value' => 20,
            'meal_ids' => [$meal->id],
            'starts_at' => now()->addMinute()->toIso8601String(),
            'ends_at' => now()->addHours(2)->toIso8601String(),
            'notifications_enabled' => false,
        ], [
            'Authorization' => "Bearer {$token}",
            'X-Tenant-Slug' => $tenant->slug,
        ]);

        $campaignId = $create->json('campaign.id');

        RevenueRecoveryCampaign::withoutGlobalScopes()
            ->where('id', $campaignId)
            ->update([
                'status' => RevenueRecoveryCampaign::STATUS_ACTIVE,
                'starts_at' => now()->subMinute(),
            ]);

        $this->postJson('/api/v1/customer/orders', [
            'name' => 'Metrics Customer',
            'phone' => '+2348099990002',
            'order_type' => 'pickup',
            'payment_method' => 'card',
            'items' => [
                ['meal_id' => $meal->id, 'quantity' => 3, 'options' => []],
            ],
        ], ['X-Tenant-Slug' => $tenant->slug])->assertCreated();

        $campaign = RevenueRecoveryCampaign::withoutGlobalScopes()->findOrFail($campaignId);
        $this->assertSame(1, $campaign->orders_count);
        $this->assertSame(1, $campaign->redemption_count);
        $this->assertSame(3, $campaign->discounted_items_sold);
    }

    public function test_dashboard_reports_open_based_redemption_rate(): void
    {
        ['token' => $token, 'tenant' => $tenant] = $this->ownerContext();
        $meal = Meal::where('tenant_id', $tenant->id)->firstOrFail();

        $campaign = RevenueRecoveryCampaign::withoutGlobalScopes()->create([
            'tenant_id' => $tenant->id,
            'name' => 'Dashboard Stats',
            'campaign_type' => 'custom',
            'discount_type' => 'percent',
            'discount_value' => 10,
            'meal_ids' => [$meal->id],
            'starts_at' => now()->subHour(),
            'ends_at' => now()->addHour(),
            'status' => RevenueRecoveryCampaign::STATUS_ACTIVE,
            'notifications_enabled' => false,
            'target_audience' => 'all',
            'orders_count' => 2,
            'notifications_opened' => 4,
            'discounted_items_sold' => 5,
        ]);

        $dashboard = $this->getJson('/api/v1/revenue-recovery/dashboard', [
            'Authorization' => "Bearer {$token}",
            'X-Tenant-Slug' => $tenant->slug,
        ]);

        $dashboard->assertOk();
        $dashboard->assertJsonPath('campaign_orders', 2);
        $dashboard->assertJsonPath('meals_sold', 5);
        $this->assertEquals(50.0, (float) $dashboard->json('redemption_rate'));
        $this->assertNotEmpty($campaign->id);
    }
}
