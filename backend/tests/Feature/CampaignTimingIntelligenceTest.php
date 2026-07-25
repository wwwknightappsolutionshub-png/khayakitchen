<?php

namespace Tests\Feature;

use App\Modules\Auth\Domain\Models\Tenant;
use App\Modules\Auth\Domain\Models\User;
use App\Modules\Engagement\Domain\Models\PlatformTenantMessage;
use App\Modules\NotificationsCampaign\Application\Services\CampaignTimingIntelligenceService;
use App\Modules\Orders\Domain\Models\Order;
use App\Modules\Pricing\Domain\Models\Feature;
use App\Modules\Pricing\Domain\Models\Plan;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CampaignTimingIntelligenceTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed();
        config([
            'campaign_timing.lookback_days' => 42,
            'campaign_timing.min_orders' => 20,
            'campaign_timing.min_cell_orders' => 2,
            'campaign_timing.summary_ttl_hours' => 24,
            'campaign_timing.pre_peak_minutes' => 45,
            'campaign_timing.max_suggestions_per_day' => 1,
            'campaign_timing.fallback_timezone' => 'UTC',
        ]);
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
        app(\App\Shared\Entitlements\FeatureAccessService::class)->clearCache($tenantId);
    }

    private function disableFeatureOnGrowth(string $featureKey): void
    {
        $feature = Feature::where('key', $featureKey)->firstOrFail();
        $plan = Plan::where('slug', 'growth')->firstOrFail();
        if ($plan->features()->where('features.id', $feature->id)->exists()) {
            $plan->features()->updateExistingPivot($feature->id, ['enabled' => false]);
        }
    }

    private function seedCompletedOrder(string $tenantId, Carbon $at, float $amount = 10): void
    {
        $order = Order::withoutGlobalScopes()->create([
            'tenant_id' => $tenantId,
            'customer_id' => null,
            'status' => 'completed',
            'order_type' => 'pickup',
            'total_amount' => $amount,
            'discount_total' => 0,
            'completed_at' => $at,
        ]);
        // created_at is not mass-assignable — force historical timestamps.
        $order->forceFill([
            'created_at' => $at,
            'updated_at' => $at,
            'completed_at' => $at,
        ])->saveQuietly();
    }

    /**
     * Seed completed orders clustered on Friday 18:00 UTC so that cell is peak.
     */
    private function seedPeakOrders(Tenant $tenant, int $count, Carbon $anchor): void
    {
        for ($i = 0; $i < $count; $i++) {
            $weeksAgo = intdiv($i, 5);
            $at = $anchor->copy()->subWeeks($weeksAgo)->setTime(18, 10, 0);
            $this->seedCompletedOrder($tenant->id, $at, 10 + $i);
        }
        for ($i = 0; $i < 3; $i++) {
            $at = $anchor->copy()->subWeeks($i)->setTime(10, 0, 0);
            $this->seedCompletedOrder($tenant->id, $at, 5);
        }
    }

    public function test_classify_cells_marks_top_quartile_as_peak(): void
    {
        $service = app(CampaignTimingIntelligenceService::class);
        $cells = [
            '5-18' => 20,
            '5-19' => 18,
            '5-10' => 3,
            '2-10' => 2,
            '3-14' => 4,
        ];
        $result = $service->classifyCells($cells);
        $this->assertContains('5-18', $result['peak_keys']);
        $this->assertNotContains('5-10', $result['peak_keys']);
        $this->assertContains('5-10', $result['off_peak_keys']);
    }

    public function test_insufficient_orders_skips_suggestion(): void
    {
        $tenant = Tenant::where('slug', 'pilot')->firstOrFail();
        $tenant->update(['timezone' => 'UTC']);
        $this->enableFeature($tenant->id, CampaignTimingIntelligenceService::FEATURE_KEY);

        // Only a handful of orders — below min_orders=20.
        $friday = Carbon::parse('2026-07-24 18:00:00', 'UTC'); // Friday
        for ($i = 0; $i < 5; $i++) {
            $this->seedCompletedOrder($tenant->id, $friday->copy()->subWeeks($i));
        }

        $service = app(CampaignTimingIntelligenceService::class);
        $message = $service->evaluateTenant($tenant, $friday->copy()->setTime(18, 5));
        $this->assertNull($message);
    }

    public function test_peak_window_creates_suggestion_and_rate_limits(): void
    {
        $tenant = Tenant::where('slug', 'pilot')->firstOrFail();
        $tenant->update(['timezone' => 'UTC']);
        $this->enableFeature($tenant->id, CampaignTimingIntelligenceService::FEATURE_KEY);

        $friday = Carbon::parse('2026-07-24 18:20:00', 'UTC');
        $this->seedPeakOrders($tenant, 25, $friday);

        $service = app(CampaignTimingIntelligenceService::class);
        $first = $service->evaluateTenant($tenant, $friday);
        $this->assertNotNull($first);
        $this->assertSame('suggestion', $first->channel);
        $this->assertSame('peak', $first->metadata['kind'] ?? null);
        $this->assertSame('/marketing', $first->metadata['cta_path'] ?? null);

        $this->assertDatabaseHas('audit_logs', [
            'action' => 'campaign_timing.suggestion_created',
            'tenant_id' => $tenant->id,
        ]);

        $second = $service->evaluateTenant($tenant, $friday->copy()->addMinutes(10));
        $this->assertNull($second, 'Second suggestion same day must be rate-limited');

        $count = PlatformTenantMessage::withoutGlobalScopes()
            ->where('tenant_id', $tenant->id)
            ->where('channel', 'suggestion')
            ->count();
        $this->assertSame(1, $count);
    }

    public function test_tenant_isolation_in_rhythm_summary(): void
    {
        $tenantA = Tenant::where('slug', 'pilot')->firstOrFail();
        $tenantA->update(['timezone' => 'UTC']);

        $tenantB = Tenant::withoutGlobalScopes()->create([
            'name' => 'Other Kitchen',
            'slug' => 'other-kitchen-timing',
            'status' => 'active',
            'timezone' => 'UTC',
            'currency' => 'GBP',
        ]);

        $friday = Carbon::parse('2026-07-24 18:00:00', 'UTC');
        $this->seedPeakOrders($tenantA, 25, $friday);

        for ($i = 0; $i < 30; $i++) {
            $at = $friday->copy()->subDays($i)->setTime(9, 0);
            $this->seedCompletedOrder($tenantB->id, $at, 8);
        }

        $service = app(CampaignTimingIntelligenceService::class);
        $summaryA = $service->recomputeSummary($tenantA);
        $summaryB = $service->recomputeSummary($tenantB);

        $this->assertNotSame($summaryA->order_count, $summaryB->order_count);
        $this->assertArrayHasKey('5-18', $summaryA->matrix['cells'] ?? []);
        $this->assertArrayNotHasKey('5-18', $summaryB->matrix['cells'] ?? []);
        $this->assertDatabaseCount('tenant_sales_rhythm_summaries', 2);
    }

    public function test_feature_gate_blocks_scheduled_processing(): void
    {
        $tenant = Tenant::where('slug', 'pilot')->firstOrFail();
        $tenant->update(['timezone' => 'UTC']);
        $this->disableFeatureOnGrowth(CampaignTimingIntelligenceService::FEATURE_KEY);
        app(\App\Shared\Entitlements\FeatureAccessService::class)->clearCache($tenant->id);

        $friday = Carbon::parse('2026-07-24 18:20:00', 'UTC');
        $this->seedPeakOrders($tenant, 25, $friday);

        $created = app(CampaignTimingIntelligenceService::class)->processDueSuggestions($friday);
        $this->assertSame(0, $created);
    }

    public function test_tenant_inbox_lists_suggestion_channel(): void
    {
        $owner = User::where('email', 'owner@khayaos.com')->firstOrFail();
        $tenant = Tenant::where('slug', 'pilot')->firstOrFail();

        app(\App\Modules\Engagement\Application\Services\PlatformTenantMessagingService::class)
            ->createSystemSuggestion($tenant->id, 'Tip', 'Body', [
                'kind' => 'peak',
                'cta_path' => '/marketing',
            ]);

        $response = $this->actingAs($owner, 'sanctum')
            ->withHeaders(['X-Tenant-Slug' => 'pilot'])
            ->getJson('/api/v1/engagement/platform-messages');

        $response->assertOk();
        $messages = $response->json('messages');
        $this->assertNotEmpty($messages);
        $this->assertSame('suggestion', $messages[0]['channel']);
        $this->assertSame('peak', $messages[0]['metadata']['kind']);
    }
}
