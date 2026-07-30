<?php

namespace Tests\Feature;

use App\Modules\Auth\Domain\Models\User;
use App\Modules\CRM\Domain\Models\Customer;
use App\Modules\Loyalty\Domain\Models\LoyaltyAccount;
use App\Modules\Loyalty\Domain\Models\LoyaltyReferral;
use App\Modules\Menu\Domain\Models\Meal;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class LoyaltyProgramTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed();
    }

    public function test_loyalty_system_is_in_feature_library_with_trial_description(): void
    {
        $admin = User::where('email', 'admin@khayaos.com')->firstOrFail();
        $token = $admin->createToken('t')->plainTextToken;

        $catalog = $this->getJson('/api/v1/platform/pricing/features?grouped=0', [
            'Authorization' => "Bearer {$token}",
        ]);
        $catalog->assertOk();
        $row = collect($catalog->json('features'))->firstWhere('key', 'loyalty_system');
        $this->assertNotNull($row);
        $this->assertStringContainsString('30 days', (string) $row['description']);
        $this->assertStringStartsWith('2026-07-14', (string) $row['implemented_at']);
    }

    public function test_owner_can_manage_packages_and_pause_enrollments(): void
    {
        $owner = User::where('email', 'owner@khayaos.com')->firstOrFail();
        $this->actingAs($owner, 'sanctum');

        $create = $this->postJson('/api/v1/loyalty/packages', [
            'name' => 'Weekend stamps',
            'package_type' => 'stamp',
            'goal_value' => 5,
            'reward_type' => 'free_meal',
            'reward_label' => 'Free drink',
        ], ['X-Tenant-Slug' => 'pilot']);
        $create->assertCreated();

        $pause = $this->patchJson('/api/v1/loyalty/settings', [
            'enrollments_paused' => true,
        ], ['X-Tenant-Slug' => 'pilot']);
        $pause->assertOk();
        $this->assertTrue($pause->json('settings.enrollments_paused'));

        $dashboard = $this->getJson('/api/v1/loyalty/program', ['X-Tenant-Slug' => 'pilot']);
        $dashboard->assertOk();
        $this->assertGreaterThanOrEqual(1, count($dashboard->json('packages')));
    }

    public function test_auto_enroll_after_two_completed_orders(): void
    {
        $owner = User::where('email', 'owner@khayaos.com')->firstOrFail();
        $customer = Customer::where('phone', '+1234567890')->firstOrFail();
        $meal = Meal::firstOrFail();

        $this->completeOrderFor($customer, $meal, $owner);
        $account = LoyaltyAccount::where('customer_id', $customer->id)->first();
        $this->assertNotNull($account);
        $this->assertNotSame('active', $account->membership_status);

        $this->completeOrderFor($customer, $meal, $owner);
        $account = $account->fresh();
        $this->assertSame('active', $account->membership_status);
        $this->assertGreaterThan(0, $account->points_balance);
        $this->assertGreaterThan(0, $account->stamps_balance);
    }

    public function test_referral_credits_referrer_only_after_referred_order_completed(): void
    {
        $owner = User::where('email', 'owner@khayaos.com')->firstOrFail();
        $this->actingAs($owner, 'sanctum');
        $referrer = Customer::where('phone', '+1234567890')->firstOrFail();
        $meal = Meal::firstOrFail();

        // Make referrer active via 2 orders
        $this->completeOrderFor($referrer, $meal, $owner);
        $this->completeOrderFor($referrer, $meal, $owner);

        $refer = $this->getJson('/api/v1/customer/meals/'.$meal->id.'/refer?phone='.urlencode($referrer->phone), [
            'X-Tenant-Slug' => 'pilot',
        ]);
        $refer->assertOk();
        $this->assertStringContainsString('/r/pilot', $refer->json('refer.menu_url'));
        $this->assertStringContainsString('Order here:', $refer->json('refer.whatsapp_text'));

        $token = LoyaltyReferral::where('referrer_customer_id', $referrer->id)->value('token');
        $this->assertNotEmpty($token);

        $friendPhone = '+15550001111';
        $orderRes = $this->postJson('/api/v1/customer/orders', [
            'name' => 'Friend',
            'phone' => $friendPhone,
            'order_type' => 'pickup',
            'payment_method' => 'card',
            'referral_token' => $token,
            'items' => [['meal_id' => $meal->id, 'quantity' => 1]],
        ], ['X-Tenant-Slug' => 'pilot']);
        $orderRes->assertCreated();

        $friend = Customer::where('phone', $friendPhone)->firstOrFail();
        $this->assertSame($referrer->id, $friend->referred_by_customer_id);

        $beforePoints = (int) LoyaltyAccount::where('customer_id', $referrer->id)->value('points_balance');
        $this->actingAs($owner, 'sanctum');
        $this->patchJson('/api/v1/orders/'.$orderRes->json('order_id').'/status', [
            'status' => 'accepted',
        ], ['X-Tenant-Slug' => 'pilot'])->assertOk();
        $this->patchJson('/api/v1/orders/'.$orderRes->json('order_id').'/status', [
            'status' => 'preparing',
        ], ['X-Tenant-Slug' => 'pilot'])->assertOk();
        $this->patchJson('/api/v1/orders/'.$orderRes->json('order_id').'/status', [
            'status' => 'ready',
        ], ['X-Tenant-Slug' => 'pilot'])->assertOk();
        $this->patchJson('/api/v1/orders/'.$orderRes->json('order_id').'/status', [
            'status' => 'completed',
        ], ['X-Tenant-Slug' => 'pilot'])->assertOk();

        $afterPoints = (int) LoyaltyAccount::where('customer_id', $referrer->id)->value('points_balance');
        $this->assertGreaterThan($beforePoints, $afterPoints);
        $this->assertDatabaseHas('loyalty_referrals', [
            'referrer_customer_id' => $referrer->id,
            'referred_customer_id' => $friend->id,
            'status' => 'credited',
        ]);
    }

    private function completeOrderFor(Customer $customer, Meal $meal, User $actor): void
    {
        $this->actingAs($actor, 'sanctum');
        $created = $this->postJson('/api/v1/customer/orders', [
            'name' => $customer->name,
            'phone' => $customer->phone,
            'order_type' => 'pickup',
            'payment_method' => 'card',
            'items' => [['meal_id' => $meal->id, 'quantity' => 1]],
        ], ['X-Tenant-Slug' => 'pilot']);
        $created->assertCreated();
        $orderId = $created->json('order_id');

        foreach (['accepted', 'preparing', 'ready', 'completed'] as $status) {
            $this->patchJson("/api/v1/orders/{$orderId}/status", [
                'status' => $status,
            ], ['X-Tenant-Slug' => 'pilot'])->assertOk();
        }
    }
}
