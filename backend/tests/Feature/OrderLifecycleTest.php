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

        $this->assertDatabaseHas('orders', ['id' => $orderId, 'status' => 'completed']);
        $this->assertTrue(
            (float) InventoryItem::first()?->fresh()->current_stock < $stockBefore,
            'Inventory should deduct after completed',
        );

        $loyalty = LoyaltyAccount::where('customer_id', $customerId)->first();
        $this->assertNotNull($loyalty);
        $this->assertGreaterThan(0, $loyalty->points_balance);

        $this->assertDatabaseHas('crm_profiles', ['customer_id' => $customerId]);
    }
}
