<?php

namespace Tests\Feature;

use App\Modules\Auth\Domain\Models\User;
use App\Modules\CRM\Domain\Models\CrmProfile;
use App\Modules\Inventory\Domain\Models\InventoryItem;
use App\Modules\Loyalty\Domain\Models\LoyaltyAccount;
use App\Modules\Menu\Domain\Models\Meal;
use App\Modules\Orders\Domain\Models\Order;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class OrderLifecycleTest extends TestCase
{
    use RefreshDatabase;

    public function test_order_lifecycle_deducts_inventory_and_awards_loyalty_on_completed(): void
    {
        $this->seed();

        $owner = User::where('email', 'owner@khayaos.com')->firstOrFail();
        $token = $owner->createToken('test')->plainTextToken;
        $meal = Meal::firstOrFail();
        $stockBefore = (float) InventoryItem::first()?->current_stock ?? 0;

        $create = $this->postJson('/api/v1/customer/orders', [
            'name' => 'Lifecycle Test',
            'phone' => '+2348099990001',
            'order_type' => 'pickup',
            'payment_method' => 'cash',
            'items' => [['meal_id' => $meal->id, 'quantity' => 1, 'options' => []]],
        ], ['X-Tenant-Slug' => 'pilot']);

        $create->assertCreated();
        $orderId = $create->json('order_id');
        $customerId = $create->json('customer_id');

        $this->assertDatabaseHas('payments', ['order_id' => $orderId, 'status' => 'paid']);

        $stockAfterOrder = (float) InventoryItem::first()?->fresh()->current_stock;
        $this->assertEqualsWithDelta($stockBefore, $stockAfterOrder, 0.0001, 'Inventory must not deduct until completed');

        $loyaltyBefore = LoyaltyAccount::where('customer_id', $customerId)->first();
        $this->assertTrue(
            $loyaltyBefore === null || $loyaltyBefore->points_balance === 0,
            'Loyalty should not be awarded before completed',
        );

        foreach (['accepted', 'preparing', 'ready', 'completed'] as $status) {
            $this->patchJson("/api/v1/orders/{$orderId}/status", ['status' => $status], [
                'Authorization' => "Bearer {$token}",
                'X-Tenant-Slug' => 'pilot',
            ])->assertOk();
        }

        // Loyalty auto-enrols after 2 completed orders; earn starts once active.
        $create2 = $this->postJson('/api/v1/customer/orders', [
            'name' => 'Lifecycle Test',
            'phone' => '+2348099990001',
            'order_type' => 'pickup',
            'payment_method' => 'cash',
            'items' => [['meal_id' => $meal->id, 'quantity' => 1, 'options' => []]],
        ], ['X-Tenant-Slug' => 'pilot']);
        $create2->assertCreated();
        $orderId2 = $create2->json('order_id');
        foreach (['accepted', 'preparing', 'ready', 'completed'] as $status) {
            $this->patchJson("/api/v1/orders/{$orderId2}/status", ['status' => $status], [
                'Authorization' => "Bearer {$token}",
                'X-Tenant-Slug' => 'pilot',
            ])->assertOk();
        }

        $this->assertDatabaseHas('orders', ['id' => $orderId, 'status' => 'completed']);
        $this->assertTrue(
            (float) InventoryItem::first()?->fresh()->current_stock < $stockBefore,
            'Inventory should deduct after completed',
        );

        $loyalty = LoyaltyAccount::where('customer_id', $customerId)->first();
        $this->assertNotNull($loyalty);
        $this->assertSame('active', $loyalty->membership_status);
        $this->assertGreaterThan(0, $loyalty->points_balance);

        $this->assertDatabaseHas('crm_profiles', ['customer_id' => $customerId]);
    }

    public function test_prior_day_open_orders_are_marked_undone(): void
    {
        $this->seed();

        $meal = Meal::firstOrFail();
        $create = $this->postJson('/api/v1/customer/orders', [
            'name' => 'Overnight Guest',
            'phone' => '+2348099990002',
            'order_type' => 'pickup',
            'payment_method' => 'cash',
            'items' => [['meal_id' => $meal->id, 'quantity' => 1, 'options' => []]],
        ], ['X-Tenant-Slug' => 'pilot']);
        $create->assertCreated();
        $orderId = $create->json('order_id');

        Order::where('id', $orderId)->update([
            'created_at' => now()->subDay()->setTime(18, 0),
            'updated_at' => now()->subDay()->setTime(18, 0),
            'status' => 'pending',
        ]);

        $this->artisan('orders:mark-undone')->assertSuccessful();

        $this->assertDatabaseHas('orders', [
            'id' => $orderId,
            'status' => 'undone',
        ]);
    }

    public function test_staff_accept_kitchen_prepare_staff_complete_flow(): void
    {
        $this->seed();

        $owner = User::where('email', 'owner@khayaos.com')->firstOrFail();
        $waiter = User::create([
            'tenant_id' => $owner->tenant_id,
            'name' => 'Waiter Flow',
            'email' => 'waiter.flow@example.test',
            'password' => 'password123',
            'role' => 'staff',
            'status' => 'active',
            'email_verified_at' => now(),
        ]);
        $chef = User::create([
            'tenant_id' => $owner->tenant_id,
            'name' => 'Chef Flow',
            'email' => 'chef.flow@example.test',
            'password' => 'password123',
            'role' => 'kitchen',
            'status' => 'active',
            'email_verified_at' => now(),
        ]);
        $meal = Meal::firstOrFail();

        $create = $this->postJson('/api/v1/customer/orders', [
            'name' => 'Flow Guest',
            'phone' => '+2348099990003',
            'order_type' => 'pickup',
            'payment_method' => 'cash',
            'items' => [['meal_id' => $meal->id, 'quantity' => 1, 'options' => []]],
        ], ['X-Tenant-Slug' => 'pilot']);
        $create->assertCreated();
        $orderId = $create->json('order_id');

        $this->actingAs($chef, 'sanctum');
        $this->patchJson("/api/v1/orders/{$orderId}/status", ['status' => 'accepted'], [
            'X-Tenant-Slug' => 'pilot',
        ])->assertForbidden();

        $this->actingAs($waiter, 'sanctum');
        $this->patchJson("/api/v1/orders/{$orderId}/status", ['status' => 'accepted'], [
            'X-Tenant-Slug' => 'pilot',
        ])->assertOk();

        $this->actingAs($waiter, 'sanctum');
        $this->patchJson("/api/v1/orders/{$orderId}/status", ['status' => 'preparing'], [
            'X-Tenant-Slug' => 'pilot',
        ])->assertForbidden();

        $this->actingAs($chef, 'sanctum');
        $this->patchJson("/api/v1/orders/{$orderId}/status", ['status' => 'preparing'], [
            'X-Tenant-Slug' => 'pilot',
        ])->assertOk();
        $this->patchJson("/api/v1/orders/{$orderId}/status", ['status' => 'ready'], [
            'X-Tenant-Slug' => 'pilot',
        ])->assertOk();

        $this->actingAs($chef, 'sanctum');
        $this->patchJson("/api/v1/orders/{$orderId}/status", ['status' => 'completed'], [
            'X-Tenant-Slug' => 'pilot',
        ])->assertForbidden();

        $this->actingAs($waiter, 'sanctum');
        $this->patchJson("/api/v1/orders/{$orderId}/status", ['status' => 'completed'], [
            'X-Tenant-Slug' => 'pilot',
        ])->assertOk();

        $this->assertDatabaseHas('orders', ['id' => $orderId, 'status' => 'completed']);
    }
}
