<?php

namespace Tests\Feature;

use App\Modules\Auth\Domain\Models\User;
use App\Modules\Auth\Mail\StaffInviteMail;
use App\Modules\Menu\Domain\Models\Meal;
use App\Modules\Orders\Domain\Models\Order;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

class StaffManagementAndPerformanceTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed();
    }

    public function test_owner_can_create_staff_and_invite_email_is_sent(): void
    {
        Mail::fake();

        $owner = User::where('email', 'owner@khayaos.com')->firstOrFail();
        $token = $owner->createToken('test')->plainTextToken;

        $response = $this->postJson('/api/v1/staff', [
            'name' => 'Ada Waiter',
            'email' => 'ada.waiter@example.test',
            'password' => 'password123',
            'role' => 'staff',
        ], [
            'Authorization' => "Bearer {$token}",
            'X-Tenant-Slug' => 'pilot',
        ]);

        $response->assertCreated();
        $response->assertJsonPath('user.email', 'ada.waiter@example.test');
        $response->assertJsonPath('user.role', 'staff');

        $this->assertDatabaseHas('users', [
            'email' => 'ada.waiter@example.test',
            'role' => 'staff',
            'tenant_id' => $owner->tenant_id,
        ]);

        Mail::assertSent(StaffInviteMail::class, function (StaffInviteMail $mail) {
            return $mail->staffEmail === 'ada.waiter@example.test'
                && $mail->temporaryPassword === 'password123';
        });

        $list = $this->getJson('/api/v1/staff', [
            'Authorization' => "Bearer {$token}",
            'X-Tenant-Slug' => 'pilot',
        ]);
        $list->assertOk();
        $emails = collect($list->json('users'))->pluck('email');
        $this->assertTrue($emails->contains('ada.waiter@example.test'));
    }

    public function test_manager_can_create_kitchen_staff(): void
    {
        Mail::fake();

        $owner = User::where('email', 'owner@khayaos.com')->firstOrFail();
        $manager = User::create([
            'tenant_id' => $owner->tenant_id,
            'name' => 'Mgr',
            'email' => 'mgr.perf@example.test',
            'password' => 'password123',
            'role' => 'manager',
            'status' => 'active',
            'email_verified_at' => now(),
        ]);
        $token = $manager->createToken('test')->plainTextToken;

        $response = $this->postJson('/api/v1/staff', [
            'name' => 'Chef Chinua',
            'email' => 'chef.chinua@example.test',
            'password' => 'password123',
            'role' => 'kitchen',
        ], [
            'Authorization' => "Bearer {$token}",
            'X-Tenant-Slug' => 'pilot',
        ]);

        $response->assertCreated();
        Mail::assertSent(StaffInviteMail::class);
    }

    public function test_staff_performance_tracks_waiter_and_chef_metrics(): void
    {
        $owner = User::where('email', 'owner@khayaos.com')->firstOrFail();

        $waiter = User::create([
            'tenant_id' => $owner->tenant_id,
            'name' => 'Floor Waiter',
            'email' => 'floor.waiter@example.test',
            'password' => 'password123',
            'role' => 'staff',
            'status' => 'active',
            'email_verified_at' => now(),
        ]);
        $chef = User::create([
            'tenant_id' => $owner->tenant_id,
            'name' => 'Line Chef',
            'email' => 'line.chef@example.test',
            'password' => 'password123',
            'role' => 'kitchen',
            'status' => 'active',
            'email_verified_at' => now(),
        ]);

        $meal = Meal::firstOrFail();
        $customerOrder = $this->postJson('/api/v1/customer/orders', [
            'name' => 'Perf Guest',
            'phone' => '+2348090001111',
            'order_type' => 'pickup',
            'payment_method' => 'card',
            'items' => [['meal_id' => $meal->id, 'quantity' => 1, 'options' => []]],
        ], ['X-Tenant-Slug' => 'pilot']);
        $customerOrder->assertCreated();
        $orderId = $customerOrder->json('order_id');

        Order::where('id', $orderId)->update(['created_by' => $waiter->id]);

        $this->actingAs($owner, 'sanctum');
        foreach (['accepted', 'preparing', 'ready', 'completed'] as $status) {
            $this->patchJson("/api/v1/orders/{$orderId}/status", ['status' => $status], [
                'X-Tenant-Slug' => 'pilot',
            ])->assertOk();
        }

        // Attribute accept/complete events to waiter/chef for metrics
        Order::where('id', $orderId)->update([
            'accepted_by' => $chef->id,
            'completed_by' => $chef->id,
        ]);
        \App\Modules\StaffPerformance\Domain\Models\OrderStatusEvent::where('order_id', $orderId)
            ->whereIn('to_status', ['accepted', 'preparing', 'ready', 'completed'])
            ->update(['user_id' => $chef->id]);

        $this->actingAs($owner, 'sanctum');
        $overview = $this->getJson('/api/v1/staff-performance?role=all', [
            'X-Tenant-Slug' => 'pilot',
        ]);
        $overview->assertOk();
        $this->assertTrue($overview->json('entitled'));

        $waiterRow = collect($overview->json('waiters'))->firstWhere('user_id', $waiter->id);
        $this->assertNotNull($waiterRow);
        $this->assertGreaterThanOrEqual(1, $waiterRow['orders_handled']);

        $chefRow = collect($overview->json('chefs'))->firstWhere('user_id', $chef->id);
        $this->assertNotNull($chefRow);
        $this->assertGreaterThanOrEqual(1, $chefRow['orders_handled']);
    }
}
