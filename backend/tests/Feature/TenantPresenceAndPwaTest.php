<?php

namespace Tests\Feature;

use App\Modules\Auth\Domain\Models\Tenant;
use App\Modules\Auth\Domain\Models\User;
use App\Modules\CRM\Domain\Models\Customer;
use App\Modules\Engagement\Mail\PlatformToTenantMail;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

class TenantPresenceAndPwaTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed();
    }

    public function test_staff_heartbeat_updates_last_seen_and_platform_sees_online(): void
    {
        $owner = User::withoutGlobalScopes()->where('email', 'owner@khayaos.com')->firstOrFail();
        $tenant = Tenant::withoutGlobalScopes()->where('slug', 'pilot')->firstOrFail();
        $token = $owner->createToken('test')->plainTextToken;

        $hb = $this->postJson('/api/v1/presence/heartbeat', [], [
            'Authorization' => "Bearer {$token}",
            'X-Tenant-Slug' => $tenant->slug,
        ]);
        $hb->assertOk();
        $hb->assertJsonPath('presence', 'online');

        $owner->refresh();
        $this->assertNotNull($owner->last_seen_at);

        app(\App\Shared\Tenancy\TenantContext::class)->clear();
        $admin = User::withoutGlobalScopes()->where('email', 'admin@khayaos.com')->firstOrFail();
        $tenants = $this->actingAs($admin, 'sanctum')->getJson('/api/v1/platform/tenants');
        $tenants->assertOk();

        $row = collect($tenants->json('tenants'))->firstWhere('slug', 'pilot');
        $this->assertNotNull($row);
        $this->assertSame('online', $row['presence']);
        $this->assertNotEmpty($row['last_seen_at']);
    }

    public function test_staff_pwa_claim_and_dashboard_counts_both_pwa_types(): void
    {
        $owner = User::withoutGlobalScopes()->where('email', 'owner@khayaos.com')->firstOrFail();
        $tenant = Tenant::withoutGlobalScopes()->where('slug', 'pilot')->firstOrFail();
        $token = $owner->createToken('test')->plainTextToken;

        $claim = $this->postJson('/api/v1/workspace/pwa-install', [], [
            'Authorization' => "Bearer {$token}",
            'X-Tenant-Slug' => $tenant->slug,
        ]);
        $claim->assertOk();
        $claim->assertJsonPath('already_claimed', false);
        $this->assertNotNull($owner->fresh()->pwa_installed_at);

        $again = $this->postJson('/api/v1/workspace/pwa-install', [], [
            'Authorization' => "Bearer {$token}",
            'X-Tenant-Slug' => $tenant->slug,
        ]);
        $again->assertOk();
        $again->assertJsonPath('already_claimed', true);

        Customer::withoutGlobalScopes()->create([
            'tenant_id' => $tenant->id,
            'name' => 'Installed Guest',
            'phone' => '+447700900001',
            'app_installed_at' => now(),
        ]);

        app(\App\Shared\Tenancy\TenantContext::class)->clear();
        $admin = User::withoutGlobalScopes()->where('email', 'admin@khayaos.com')->firstOrFail();
        $dash = $this->actingAs($admin, 'sanctum')->getJson('/api/v1/platform/dashboard');
        $dash->assertOk();
        $this->assertGreaterThanOrEqual(1, (int) $dash->json('tenants_with_staff_pwa'));
        $this->assertGreaterThanOrEqual(1, (int) $dash->json('customers_with_pwa'));
        $this->assertGreaterThanOrEqual(1, (int) $dash->json('tenants_with_customer_pwa'));
    }

    public function test_super_admin_can_poke_tenant(): void
    {
        Mail::fake();

        $admin = User::withoutGlobalScopes()->where('email', 'admin@khayaos.com')->firstOrFail();
        $tenant = Tenant::withoutGlobalScopes()->where('slug', 'pilot')->firstOrFail();

        $poke = $this->actingAs($admin, 'sanctum')->postJson("/api/v1/platform/tenants/{$tenant->id}/poke");
        $poke->assertOk();
        $poke->assertJsonPath('channel', 'email');

        Mail::assertSent(PlatformToTenantMail::class);
        $this->assertNotNull($tenant->fresh()->last_poked_at);

        $again = $this->actingAs($admin, 'sanctum')->postJson("/api/v1/platform/tenants/{$tenant->id}/poke");
        $again->assertStatus(422);
    }
}
