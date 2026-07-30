<?php

namespace Tests\Feature;

use App\Modules\Auth\Domain\Models\Tenant;
use App\Modules\Menu\Domain\Models\Meal;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TenantSlugResolutionTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed();
    }

    public function test_guest_order_prefers_tenant_slug_over_stale_tenant_id(): void
    {
        $pilot = Tenant::where('slug', 'pilot')->firstOrFail();
        $meal = Meal::where('tenant_id', $pilot->id)->firstOrFail();

        $other = Tenant::create([
            'name' => 'Other Kitchen',
            'slug' => 'other-kitchen',
            'status' => 'active',
            'currency' => 'GBP',
            'ui_theme' => 'light',
        ]);

        $response = $this->postJson('/api/v1/customer/orders', [
            'name' => 'QR Customer',
            'phone' => '+2348099998888',
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
            'X-Tenant-ID' => $other->id,
            'X-Tenant-Slug' => 'pilot',
        ]);

        $response->assertCreated();

        $this->assertDatabaseHas('orders', [
            'id' => $response->json('order_id'),
            'tenant_id' => $pilot->id,
        ]);

        $this->assertDatabaseMissing('orders', [
            'id' => $response->json('order_id'),
            'tenant_id' => $other->id,
        ]);
    }
}
