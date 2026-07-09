<?php

namespace Tests\Feature;

use App\Modules\Auth\Domain\Models\Tenant;
use App\Modules\Auth\Domain\Models\User;
use App\Modules\CRM\Domain\Models\Customer;
use App\Modules\Menu\Domain\Models\Meal;
use App\Modules\Pricing\Domain\Models\Feature;
use App\Modules\RevenueRecovery\Application\Services\ProximityEvaluationService;
use App\Modules\RevenueRecovery\Domain\Models\CustomerEmailOtp;
use App\Modules\RevenueRecovery\Domain\Models\RevenueRecoveryCampaign;
use App\Modules\RevenueRecovery\Domain\Models\TenantRevenueRecoverySettings;
use App\Modules\RevenueRecovery\Mail\CustomerProximityOtpMail;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

class ProximityRevenueRecoveryTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed();
    }

    /**
     * @return array{token: string, tenant: Tenant, superToken: string}
     */
    private function contexts(): array
    {
        $owner = User::where('email', 'owner@khayaos.com')->firstOrFail();
        $super = User::where('role', 'super_admin')->firstOrFail();
        $tenant = Tenant::where('slug', 'pilot')->firstOrFail();

        return [
            'token' => $owner->createToken('test')->plainTextToken,
            'tenant' => $tenant,
            'superToken' => $super->createToken('test')->plainTextToken,
        ];
    }

    private function enableProximityFeatures(Tenant $tenant): TenantRevenueRecoverySettings
    {
        foreach (['revenue_recovery.time_based', 'revenue_recovery.proximity'] as $key) {
            $feature = Feature::firstOrCreate(
                ['key' => $key],
                [
                    'name' => $key,
                    'category' => 'marketing',
                    'module' => 'revenue_recovery',
                    'description' => $key,
                    'status' => 'active',
                ],
            );

            DB::table('plan_features')
                ->where('feature_id', $feature->id)
                ->update(['enabled' => true]);
        }

        $settings = TenantRevenueRecoverySettings::create([
            'tenant_id' => $tenant->id,
            'time_based_enabled' => true,
            'proximity_enabled' => true,
            'geofence_radius_km' => 10,
            'tenant_can_edit_radius' => true,
            'kitchen_lat' => 6.5244,
            'kitchen_lng' => 3.3792,
            'kitchen_address_text' => 'Lagos, Nigeria',
            'proximity_bait_tiers' => TenantRevenueRecoverySettings::DEFAULT_BAIT_TIERS,
            'max_daily_proximity_pushes_per_customer' => 1,
            'location_accuracy_max_meters' => 500,
        ]);

        return $settings;
    }

    public function test_only_one_active_campaign_per_tenant_on_activate(): void
    {
        ['token' => $token, 'tenant' => $tenant] = $this->contexts();
        $this->enableProximityFeatures($tenant);
        $meal = Meal::where('tenant_id', $tenant->id)->firstOrFail();

        $first = $this->postJson('/api/v1/revenue-recovery/campaigns', [
            'name' => 'Happy Hour A',
            'campaign_type' => 'happy_hour',
            'discount_type' => 'percent',
            'discount_value' => 10,
            'meal_ids' => [$meal->id],
            'starts_at' => now()->subMinute()->toIso8601String(),
            'ends_at' => now()->addHours(2)->toIso8601String(),
        ], [
            'Authorization' => "Bearer {$token}",
            'X-Tenant-Slug' => $tenant->slug,
        ])->assertCreated();

        $second = $this->postJson('/api/v1/revenue-recovery/campaigns', [
            'name' => 'Happy Hour B',
            'campaign_type' => 'happy_hour',
            'discount_type' => 'percent',
            'discount_value' => 15,
            'meal_ids' => [$meal->id],
            'starts_at' => now()->subMinute()->toIso8601String(),
            'ends_at' => now()->addHours(2)->toIso8601String(),
        ], [
            'Authorization' => "Bearer {$token}",
            'X-Tenant-Slug' => $tenant->slug,
        ])->assertCreated();

        $firstId = $first->json('campaign.id');
        $secondId = $second->json('campaign.id');

        $this->postJson("/api/v1/revenue-recovery/campaigns/{$firstId}/activate", [], [
            'Authorization' => "Bearer {$token}",
            'X-Tenant-Slug' => $tenant->slug,
        ])->assertOk();

        $this->postJson("/api/v1/revenue-recovery/campaigns/{$secondId}/activate", [], [
            'Authorization' => "Bearer {$token}",
            'X-Tenant-Slug' => $tenant->slug,
        ])->assertOk();

        $this->assertSame(
            RevenueRecoveryCampaign::STATUS_DEACTIVATED,
            RevenueRecoveryCampaign::withoutGlobalScopes()->find($firstId)->status,
        );
        $this->assertSame(
            RevenueRecoveryCampaign::STATUS_ACTIVE,
            RevenueRecoveryCampaign::withoutGlobalScopes()->find($secondId)->status,
        );
    }

    public function test_proximity_campaign_does_not_apply_checkout_discount(): void
    {
        ['token' => $token, 'tenant' => $tenant] = $this->contexts();
        $this->enableProximityFeatures($tenant);
        $meal = Meal::where('tenant_id', $tenant->id)->firstOrFail();
        $basePrice = (float) $meal->base_price;

        $create = $this->postJson('/api/v1/revenue-recovery/campaigns', [
            'name' => 'Nearby Bait',
            'campaign_type' => 'proximity',
            'starts_at' => now()->subMinute()->toIso8601String(),
            'ends_at' => now()->addYear()->toIso8601String(),
            'notifications_enabled' => false,
        ], [
            'Authorization' => "Bearer {$token}",
            'X-Tenant-Slug' => $tenant->slug,
        ])->assertCreated();

        $campaignId = $create->json('campaign.id');

        $this->postJson("/api/v1/revenue-recovery/campaigns/{$campaignId}/activate", [], [
            'Authorization' => "Bearer {$token}",
            'X-Tenant-Slug' => $tenant->slug,
        ])->assertOk();

        $order = $this->postJson('/api/v1/customer/orders', [
            'name' => 'Proximity Customer',
            'phone' => '+2348099990100',
            'order_type' => 'pickup',
            'payment_method' => 'cash',
            'items' => [
                ['meal_id' => $meal->id, 'quantity' => 1, 'options' => []],
            ],
        ], [
            'X-Tenant-Slug' => $tenant->slug,
        ])->assertCreated();

        $this->assertEquals($basePrice, (float) $order->json('total'));
        $this->assertDatabaseMissing('orders', [
            'tenant_id' => $tenant->id,
            'revenue_recovery_campaign_id' => $campaignId,
        ]);
    }

    public function test_customer_email_otp_verification_and_bait_endpoint(): void
    {
        ['tenant' => $tenant] = $this->contexts();
        $this->enableProximityFeatures($tenant);

        $customer = Customer::create([
            'tenant_id' => $tenant->id,
            'name' => 'Known Customer',
            'phone' => '+2348099990200',
            'email' => 'known@example.com',
        ]);

        Mail::fake();

        $this->postJson('/api/v1/customer/proximity/auth/request-otp', [
            'phone' => $customer->phone,
            'email' => $customer->email,
        ], [
            'X-Tenant-Slug' => $tenant->slug,
        ])->assertOk();

        Mail::assertSent(CustomerProximityOtpMail::class);

        $otpRecord = CustomerEmailOtp::where('tenant_id', $tenant->id)
            ->where('phone', $customer->phone)
            ->firstOrFail();

        $otp = '123456';
        $otpRecord->update(['otp_hash' => Hash::make($otp)]);

        $verify = $this->postJson('/api/v1/customer/proximity/auth/verify-otp', [
            'phone' => $customer->phone,
            'email' => $customer->email,
            'otp' => $otp,
        ], [
            'X-Tenant-Slug' => $tenant->slug,
        ])->assertOk();

        $sessionToken = $verify->json('session_token');
        $this->assertNotEmpty($sessionToken);

        $this->postJson('/api/v1/customer/proximity/auth/location-opt-in', [
            'location_opt_in' => true,
        ], [
            'X-Tenant-Slug' => $tenant->slug,
            'X-Customer-Session' => $sessionToken,
        ])->assertOk();

        RevenueRecoveryCampaign::create([
            'tenant_id' => $tenant->id,
            'name' => 'Proximity Live',
            'campaign_type' => RevenueRecoveryCampaign::TYPE_PROXIMITY,
            'discount_type' => RevenueRecoveryCampaign::DISCOUNT_PERCENT,
            'discount_value' => 0,
            'meal_ids' => [],
            'starts_at' => now()->subMinute(),
            'ends_at' => now()->addYear(),
            'status' => RevenueRecoveryCampaign::STATUS_ACTIVE,
            'notifications_enabled' => false,
            'target_audience' => 'all',
        ]);

        $nearLat = 6.5250;
        $nearLng = 3.3795;

        $bait = $this->getJson('/api/v1/customer/proximity/bait?'.http_build_query([
            'lat' => $nearLat,
            'lng' => $nearLng,
            'accuracy_meters' => 50,
        ]), [
            'X-Tenant-Slug' => $tenant->slug,
            'X-Customer-Session' => $sessionToken,
        ])->assertOk();

        $this->assertNotNull($bait->json('bait.message'));
        $this->assertLessThan(10, (float) $bait->json('bait.distance_km'));
    }

    public function test_platform_can_update_tenant_proximity_settings(): void
    {
        ['tenant' => $tenant, 'superToken' => $superToken] = $this->contexts();

        $response = $this->patchJson("/api/v1/platform/revenue-recovery/tenants/{$tenant->id}", [
            'proximity_enabled' => true,
            'time_based_enabled' => true,
            'geofence_radius_km' => 12,
            'tenant_can_edit_radius' => false,
        ], [
            'Authorization' => "Bearer {$superToken}",
        ])->assertOk();

        $response->assertJsonPath('settings.proximity_enabled', true);
        $response->assertJsonPath('settings.geofence_radius_km', 12);
        $response->assertJsonPath('settings.tenant_can_edit_radius', false);
    }

    public function test_proximity_evaluation_ignores_low_accuracy(): void
    {
        ['tenant' => $tenant] = $this->contexts();
        $settings = $this->enableProximityFeatures($tenant);

        RevenueRecoveryCampaign::create([
            'tenant_id' => $tenant->id,
            'name' => 'Proximity Live',
            'campaign_type' => RevenueRecoveryCampaign::TYPE_PROXIMITY,
            'discount_type' => RevenueRecoveryCampaign::DISCOUNT_PERCENT,
            'discount_value' => 0,
            'meal_ids' => [],
            'starts_at' => now()->subMinute(),
            'ends_at' => now()->addYear(),
            'status' => RevenueRecoveryCampaign::STATUS_ACTIVE,
            'notifications_enabled' => false,
            'target_audience' => 'all',
        ]);

        $service = app(ProximityEvaluationService::class);
        $result = $service->evaluateForCoordinates(
            $tenant->id,
            '00000000-0000-0000-0000-000000000001',
            6.5250,
            3.3795,
            800,
        );

        $this->assertNull($result);
        $this->assertSame(500, $settings->location_accuracy_max_meters);
    }
}
