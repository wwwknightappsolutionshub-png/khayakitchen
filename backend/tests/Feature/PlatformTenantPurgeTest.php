<?php

namespace Tests\Feature;

use App\Modules\Auth\Domain\Models\Tenant;
use App\Modules\Auth\Domain\Models\User;
use App\Modules\Menu\Domain\Models\Meal;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class PlatformTenantPurgeTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed();
    }

    public function test_super_admin_can_permanently_purge_tenant_and_free_email(): void
    {
        $admin = User::where('email', 'admin@khayaos.com')->firstOrFail();
        $token = $admin->createToken('test')->plainTextToken;

        $tenant = Tenant::where('slug', 'pilot')->firstOrFail();
        $owner = User::where('email', 'owner@khayaos.com')->firstOrFail();
        $this->assertSame($tenant->id, $owner->tenant_id);

        Meal::withoutGlobalScopes()->where('tenant_id', $tenant->id)->exists();

        $denied = $this->postJson("/api/v1/platform/tenants/{$tenant->id}/purge", [
            'confirmation_slug' => 'wrong-slug',
            'confirm' => true,
        ], ['Authorization' => "Bearer {$token}"]);
        $denied->assertStatus(422);

        $purge = $this->postJson("/api/v1/platform/tenants/{$tenant->id}/purge", [
            'confirmation_slug' => 'pilot',
            'confirm' => true,
        ], ['Authorization' => "Bearer {$token}"]);
        $purge->assertOk();
        $purge->assertJsonPath('purged', true);
        $purge->assertJsonPath('slug', 'pilot');

        $this->assertDatabaseMissing('tenants', ['id' => $tenant->id]);
        $this->assertDatabaseMissing('users', ['email' => 'owner@khayaos.com']);
        $this->assertSame(0, Meal::withoutGlobalScopes()->where('tenant_id', $tenant->id)->count());
        $this->assertSame(0, DB::table('orders')->where('tenant_id', $tenant->id)->count());
    }

    public function test_delete_tenant_only_suspends(): void
    {
        $admin = User::where('email', 'admin@khayaos.com')->firstOrFail();
        $token = $admin->createToken('test')->plainTextToken;
        $tenant = Tenant::where('slug', 'pilot')->firstOrFail();

        $response = $this->deleteJson("/api/v1/platform/tenants/{$tenant->id}", [], [
            'Authorization' => "Bearer {$token}",
        ]);
        $response->assertOk();
        $response->assertJsonPath('mode', 'suspended');

        $this->assertDatabaseHas('tenants', [
            'id' => $tenant->id,
            'status' => 'suspended',
        ]);
    }
}
