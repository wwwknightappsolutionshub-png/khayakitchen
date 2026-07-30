<?php

namespace Tests\Feature;

use App\Modules\Auth\Domain\Models\Tenant;
use App\Modules\Menu\Domain\Models\Meal;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CustomerOrderTest extends TestCase
{
    use RefreshDatabase;

    public function test_guest_can_place_customer_order(): void
    {
        $this->seed();

        $tenant = Tenant::where('slug', 'pilot')->firstOrFail();
        $meal = Meal::where('tenant_id', $tenant->id)->firstOrFail();

        $response = $this->postJson('/api/v1/customer/orders', [
            'name' => 'Ada Customer',
            'phone' => '+2348012345678',
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
            'X-Tenant-Slug' => 'pilot',
        ]);

        $response->assertCreated()
            ->assertJsonPath('status', 'pending')
            ->assertJsonStructure(['order_id', 'customer_id', 'total']);

        $this->assertDatabaseHas('orders', [
            'tenant_id' => $tenant->id,
            'order_type' => 'pickup',
        ]);

        $this->assertDatabaseHas('customers', [
            'tenant_id' => $tenant->id,
            'phone' => '+2348012345678',
        ]);

        $this->assertDatabaseHas('payments', [
            'tenant_id' => $tenant->id,
            'provider' => 'card',
            'status' => 'paid',
        ]);
    }

    public function test_guest_can_place_delivery_order_with_address(): void
    {
        $this->seed();

        $tenant = Tenant::where('slug', 'pilot')->firstOrFail();
        $meal = Meal::where('tenant_id', $tenant->id)->firstOrFail();

        $response = $this->postJson('/api/v1/customer/orders', [
            'name' => 'Delivery Customer',
            'phone' => '+2348012345679',
            'order_type' => 'delivery',
            'address' => '12 Victoria Island, Lagos',
            'payment_method' => 'card',
            'items' => [
                [
                    'meal_id' => $meal->id,
                    'quantity' => 1,
                    'options' => [],
                ],
            ],
        ], [
            'X-Tenant-Slug' => 'pilot',
        ]);

        $response->assertCreated();

        $orderId = $response->json('order_id');

        $this->assertDatabaseHas('delivery_orders', [
            'order_id' => $orderId,
            'delivery_address' => '12 Victoria Island, Lagos',
        ]);
    }
}
