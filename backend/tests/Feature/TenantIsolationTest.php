<?php

namespace Tests\Feature;

use App\Modules\Auth\Domain\Models\Tenant;
use App\Modules\Auth\Domain\Models\User;
use App\Modules\Orders\Domain\Models\Order;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

class TenantIsolationTest extends TestCase
{
    use RefreshDatabase;

    public function test_authenticated_user_cannot_override_tenant_via_header(): void
    {
        $this->seed();

        $pilot = Tenant::where('slug', 'pilot')->firstOrFail();
        $owner = User::where('email', 'owner@khayaos.com')->firstOrFail();
        $token = $owner->createToken('test')->plainTextToken;

        $otherId = (string) Str::uuid();
        Tenant::create([
            'id' => $otherId,
            'tenant_id' => $otherId,
            'name' => 'Other Restaurant',
            'slug' => 'other',
            'status' => 'active',
        ]);

        Order::withoutGlobalScopes()->create([
            'id' => (string) Str::uuid(),
            'tenant_id' => $otherId,
            'status' => 'pending',
            'order_type' => 'pickup',
            'total_amount' => 99,
        ]);

        $response = $this->getJson('/api/v1/orders', [
            'Authorization' => "Bearer {$token}",
            'X-Tenant-ID' => $otherId,
        ]);

        $response->assertOk();
        $orders = $response->json('orders') ?? [];
        foreach ($orders as $order) {
            $this->assertNotEquals(99, (float) ($order['total_amount'] ?? 0));
        }

        $this->assertSame($pilot->id, $owner->tenant_id);
    }
}
