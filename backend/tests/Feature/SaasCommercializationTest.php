<?php

namespace Tests\Feature;

use App\Modules\Auth\Domain\Models\Tenant;
use App\Modules\Auth\Domain\Models\User;
use App\Modules\Menu\Domain\Models\Meal;
use App\Modules\Platform\Application\Services\PlatformSettingsService;
use App\Modules\Pricing\Domain\Models\Feature;
use App\Modules\Pricing\Domain\Models\Plan;
use App\Modules\Pricing\Domain\Models\TenantSubscription;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class SaasCommercializationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed();
    }

    private function adminToken(): string
    {
        return User::where('email', 'admin@khayaos.com')->firstOrFail()->createToken('test')->plainTextToken;
    }

    private function ownerContext(): array
    {
        $owner = User::where('email', 'owner@khayaos.com')->firstOrFail();

        return [
            'token' => $owner->createToken('test')->plainTextToken,
            'tenant' => Tenant::where('slug', 'pilot')->firstOrFail(),
        ];
    }

    public function test_super_admin_can_create_and_update_plan(): void
    {
        $token = $this->adminToken();

        $create = $this->postJson('/api/v1/platform/pricing/plans', [
            'name' => 'Enterprise Test',
            'price_monthly' => 299,
            'price_yearly' => 2990,
            'max_menu_items' => 1000,
            'is_active' => true,
            'is_visible' => true,
        ], ['Authorization' => "Bearer {$token}"]);

        $create->assertCreated();
        $planId = $create->json('plan.id');
        $this->assertNotEmpty($planId);

        $update = $this->putJson("/api/v1/platform/pricing/plans/{$planId}", [
            'description' => 'Enterprise tier for large kitchens',
            'is_recommended' => true,
        ], ['Authorization' => "Bearer {$token}"]);

        $update->assertOk();
        $update->assertJsonPath('plan.description', 'Enterprise tier for large kitchens');
    }

    public function test_super_admin_can_manage_feature_library(): void
    {
        $token = $this->adminToken();

        $create = $this->postJson('/api/v1/platform/pricing/features', [
            'key' => 'custom_feature_test',
            'name' => 'Custom Feature',
            'category' => 'platform',
            'description' => 'Test feature',
            'implemented_at' => '2026-07-14',
        ], ['Authorization' => "Bearer {$token}"]);

        $create->assertCreated();
        $featureId = $create->json('feature.id');
        $this->assertStringStartsWith('2026-07-14', (string) $create->json('feature.implemented_at'));

        $update = $this->putJson("/api/v1/platform/pricing/features/{$featureId}", [
            'status' => 'active',
            'module' => 'custom',
            'implemented_at' => '2026-07-15',
        ], ['Authorization' => "Bearer {$token}"]);

        $update->assertOk();
        $this->assertStringStartsWith('2026-07-15', (string) $update->json('feature.implemented_at'));

        $catalog = $this->getJson('/api/v1/platform/pricing/features?grouped=0', [
            'Authorization' => "Bearer {$token}",
        ]);
        $catalog->assertOk();
        $staffPerf = collect($catalog->json('features'))->firstWhere('key', 'staff_performance');
        $this->assertNotNull($staffPerf);
        $this->assertSame('staff_performance', $staffPerf['module']);
        $this->assertStringStartsWith('2026-07-14', (string) $staffPerf['implemented_at']);

        $delete = $this->deleteJson("/api/v1/platform/pricing/features/{$featureId}", [], [
            'Authorization' => "Bearer {$token}",
        ]);
        $delete->assertOk();
    }

    public function test_super_admin_can_override_tenant_feature_and_limit(): void
    {
        $token = $this->adminToken();
        ['tenant' => $tenant] = $this->ownerContext();

        $feature = $this->postJson("/api/v1/platform/pricing/tenants/{$tenant->id}/entitlements/features", [
            'feature_key' => 'inventory_tracking',
            'enabled' => true,
            'reason' => 'Pilot extension',
        ], ['Authorization' => "Bearer {$token}"]);
        $feature->assertOk();

        $limit = $this->postJson("/api/v1/platform/pricing/tenants/{$tenant->id}/entitlements/limits", [
            'limit_key' => 'max_menu_items',
            'value' => 999,
            'reason' => 'Temporary menu boost',
        ], ['Authorization' => "Bearer {$token}"]);
        $limit->assertOk();

        $reset = $this->postJson("/api/v1/platform/pricing/tenants/{$tenant->id}/entitlements/reset", [
            'reason' => 'Back to plan defaults',
        ], ['Authorization' => "Bearer {$token}"]);
        $reset->assertOk();
    }

    public function test_meal_limit_is_enforced_for_tenant_owner(): void
    {
        ['token' => $token, 'tenant' => $tenant] = $this->ownerContext();

        $plan = Plan::where('slug', 'starter')->first() ?? Plan::firstOrFail();
        $plan->update(['max_menu_items' => 1]);
        app(\App\Modules\Pricing\Application\Services\SubscriptionService::class)
            ->assignPlan($tenant->id, $plan->id, 'active');

        Meal::withoutGlobalScopes()->where('tenant_id', $tenant->id)->forceDelete();

        $first = $this->postJson('/api/v1/menu/meals', [
            'name' => 'Limit Meal One',
            'base_price' => 10,
        ], [
            'Authorization' => "Bearer {$token}",
            'X-Tenant-Slug' => 'pilot',
        ]);
        $first->assertCreated();

        $second = $this->postJson('/api/v1/menu/meals', [
            'name' => 'Limit Meal Two',
            'base_price' => 12,
        ], [
            'Authorization' => "Bearer {$token}",
            'X-Tenant-Slug' => 'pilot',
        ]);
        $second->assertStatus(422);
    }

    public function test_feature_enforcement_blocks_disabled_module(): void
    {
        ['token' => $token, 'tenant' => $tenant] = $this->ownerContext();

        $subscription = TenantSubscription::where('tenant_id', $tenant->id)->firstOrFail();
        $inventoryFeature = Feature::where('key', 'inventory_tracking')->firstOrFail();
        $subscription->plan->features()->sync([$inventoryFeature->id => ['enabled' => false]]);

        $response = $this->getJson('/api/v1/inventory', [
            'Authorization' => "Bearer {$token}",
            'X-Tenant-Slug' => 'pilot',
        ]);

        $response->assertForbidden();
    }

    public function test_tenant_owner_cannot_access_platform_pricing_routes(): void
    {
        ['token' => $token] = $this->ownerContext();

        $response = $this->getJson('/api/v1/platform/pricing/plans', [
            'Authorization' => "Bearer {$token}",
        ]);

        $response->assertForbidden();
    }

    public function test_public_pricing_hidden_when_disabled(): void
    {
        app(PlatformSettingsService::class)->update(['public_pricing_enabled' => false]);

        $response = $this->getJson('/api/v1/pricing/plans');
        $response->assertNotFound();
    }

    public function test_public_pricing_visible_when_enabled(): void
    {
        app(PlatformSettingsService::class)->update(['public_pricing_enabled' => true]);

        $response = $this->getJson('/api/v1/pricing/plans');
        $response->assertOk();
        $this->assertNotEmpty($response->json('plans'));
    }

    public function test_plan_changes_are_audit_logged(): void
    {
        $token = $this->adminToken();

        $this->postJson('/api/v1/platform/pricing/plans', [
            'name' => 'Audit Plan',
            'price_monthly' => 49,
            'price_yearly' => 490,
        ], ['Authorization' => "Bearer {$token}"])->assertCreated();

        $logged = DB::table('audit_logs')->where('action', 'plan.created')->exists();
        $this->assertTrue($logged);
    }

    public function test_entitlements_endpoint_returns_usage(): void
    {
        ['token' => $token] = $this->ownerContext();

        $response = $this->getJson('/api/v1/entitlements', [
            'Authorization' => "Bearer {$token}",
            'X-Tenant-Slug' => 'pilot',
        ]);

        $response->assertOk();
        $response->assertJsonStructure(['flags', 'limits', 'usage', 'plan']);
    }
}
