<?php

namespace Tests\Feature;

use App\Modules\Auth\Domain\Models\Tenant;
use App\Modules\Auth\Domain\Models\User;
use App\Modules\CRM\Domain\Models\Customer;
use App\Modules\Menu\Domain\Models\Meal;
use App\Modules\Orders\Domain\Models\Order;
use App\Modules\Orders\Domain\Models\OrderItem;
use App\Modules\Orders\Domain\Models\Payment;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TenantWorkspaceAndOrdersCrmTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed();
    }

    /**
     * @return array{token: string, tenant: Tenant}
     */
    private function ownerContext(): array
    {
        $owner = User::where('email', 'owner@khayaos.com')->firstOrFail();

        return [
            'token' => $owner->createToken('test')->plainTextToken,
            'tenant' => Tenant::where('slug', 'pilot')->firstOrFail(),
        ];
    }

    public function test_workspace_settings_update_currency_country_and_theme(): void
    {
        ['token' => $token, 'tenant' => $tenant] = $this->ownerContext();

        $response = $this->patchJson('/api/v1/workspace', [
            'currency' => 'NGN',
            'country' => 'Nigeria',
            'country_iso' => 'NG',
            'timezone' => 'Africa/Lagos',
            'ui_theme' => 'dark',
        ], [
            'Authorization' => "Bearer {$token}",
            'X-Tenant-Slug' => $tenant->slug,
        ]);

        $response->assertOk();
        $response->assertJsonPath('workspace.currency', 'NGN');
        $response->assertJsonPath('workspace.country', 'Nigeria');
        $response->assertJsonPath('workspace.ui_theme', 'dark');
        $response->assertJsonPath('workspace.ordering_path', '/r/pilot');

        $this->assertDatabaseHas('tenants', [
            'id' => $tenant->id,
            'currency' => 'NGN',
            'ui_theme' => 'dark',
        ]);
    }

    public function test_orders_list_includes_customer_and_payment_channel(): void
    {
        ['token' => $token, 'tenant' => $tenant] = $this->ownerContext();
        $meal = Meal::where('tenant_id', $tenant->id)->firstOrFail();

        $customer = Customer::create([
            'tenant_id' => $tenant->id,
            'name' => 'Ada Obi',
            'phone' => '+2348011112222',
        ]);

        $order = Order::create([
            'tenant_id' => $tenant->id,
            'customer_id' => $customer->id,
            'status' => 'pending',
            'order_type' => 'pickup',
            'total_amount' => 12.5,
            'discount_total' => 0,
        ]);

        OrderItem::create([
            'tenant_id' => $tenant->id,
            'order_id' => $order->id,
            'meal_id' => $meal->id,
            'quantity' => 1,
            'base_price' => 12.5,
            'final_price' => 12.5,
            'discount_amount' => 0,
        ]);

        Payment::create([
            'tenant_id' => $tenant->id,
            'order_id' => $order->id,
            'provider' => 'card',
            'status' => 'paid',
            'amount' => 12.5,
            'created_at' => now(),
        ]);

        $response = $this->getJson('/api/v1/orders', [
            'Authorization' => "Bearer {$token}",
            'X-Tenant-Slug' => $tenant->slug,
        ]);

        $response->assertOk();
        $orders = $response->json('orders');
        $this->assertNotEmpty($orders);
        $match = collect($orders)->firstWhere('id', $order->id);
        $this->assertNotNull($match);
        $this->assertSame('Ada Obi', $match['customer_name']);
        $this->assertSame('+2348011112222', $match['customer_phone']);
        $this->assertSame('card', $match['payment_channel']);

        $order->update(['status' => 'accepted']);

        $kitchen = $this->getJson('/api/v1/kitchen/orders', [
            'Authorization' => "Bearer {$token}",
            'X-Tenant-Slug' => $tenant->slug,
        ]);

        $kitchen->assertOk();
        $kitchenOrders = $kitchen->json('orders');
        $this->assertIsArray($kitchenOrders);
        $this->assertNotNull(collect($kitchenOrders)->firstWhere('id', $order->id));
    }

    public function test_kitchen_can_reject_pending_order(): void
    {
        ['token' => $token, 'tenant' => $tenant] = $this->ownerContext();

        $order = Order::create([
            'tenant_id' => $tenant->id,
            'customer_id' => null,
            'status' => 'pending',
            'order_type' => 'pickup',
            'total_amount' => 9.5,
            'discount_total' => 0,
        ]);

        $reject = $this->patchJson("/api/v1/kitchen/orders/{$order->id}", [
            'status' => 'cancelled',
        ], [
            'Authorization' => "Bearer {$token}",
            'X-Tenant-Slug' => $tenant->slug,
        ]);

        $reject->assertOk();
        $reject->assertJsonPath('order.status', 'cancelled');
        $this->assertDatabaseHas('orders', [
            'id' => $order->id,
            'status' => 'cancelled',
        ]);
    }

    public function test_crm_strategic_analytics_returns_period_metrics(): void
    {
        ['token' => $token, 'tenant' => $tenant] = $this->ownerContext();
        $meal = Meal::where('tenant_id', $tenant->id)->firstOrFail();

        $referrer = Customer::create([
            'tenant_id' => $tenant->id,
            'name' => 'Referrer',
            'phone' => '+2348000000001',
        ]);

        Customer::create([
            'tenant_id' => $tenant->id,
            'name' => 'Referred',
            'phone' => '+2348000000002',
            'referred_by_customer_id' => $referrer->id,
        ]);

        $customer = Customer::create([
            'tenant_id' => $tenant->id,
            'name' => 'Buyer',
            'phone' => '+2348000000003',
        ]);

        $order = Order::create([
            'tenant_id' => $tenant->id,
            'customer_id' => $customer->id,
            'status' => 'completed',
            'order_type' => 'pickup',
            'total_amount' => 25,
            'discount_total' => 0,
            'created_at' => now(),
        ]);

        OrderItem::create([
            'tenant_id' => $tenant->id,
            'order_id' => $order->id,
            'meal_id' => $meal->id,
            'quantity' => 2,
            'base_price' => 12.5,
            'final_price' => 12.5,
            'discount_amount' => 0,
        ]);

        $response = $this->getJson('/api/v1/customers/analytics?from='.now()->subDay()->toDateString().'&to='.now()->toDateString(), [
            'Authorization' => "Bearer {$token}",
            'X-Tenant-Slug' => $tenant->slug,
        ]);

        $response->assertOk();
        $response->assertJsonPath('referral_count', 1);
        $this->assertGreaterThan(0, (float) $response->json('total_amount_spent'));
        $this->assertNotEmpty($response->json('food_bought'));
        $this->assertNotNull($response->json('preferred_food'));
        $this->assertIsArray($response->json('reward_qualification_by_spend'));
    }

    public function test_storefront_includes_workspace_currency_and_theme(): void
    {
        $tenant = Tenant::where('slug', 'pilot')->firstOrFail();
        $tenant->update([
            'currency' => 'USD',
            'ui_theme' => 'light',
        ]);

        $response = $this->getJson('/api/v1/storefront', [
            'X-Tenant-Slug' => $tenant->slug,
        ]);

        $response->assertOk();
        $response->assertJsonPath('workspace.currency', 'USD');
        $response->assertJsonPath('workspace.ui_theme', 'light');
        $response->assertJsonPath('workspace.ordering_path', '/r/pilot');
    }
}
