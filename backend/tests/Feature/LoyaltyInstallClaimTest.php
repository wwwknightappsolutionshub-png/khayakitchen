<?php

namespace Tests\Feature;

use App\Modules\Auth\Domain\Models\User;
use App\Modules\CRM\Domain\Models\Customer;
use App\Modules\Loyalty\Domain\Models\LoyaltyAccount;
use App\Modules\Loyalty\Mail\LoyaltyCustomerMail;
use App\Modules\Menu\Domain\Models\Meal;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

class LoyaltyInstallClaimTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed();
    }

    public function test_order_marks_new_customer_eligible_but_does_not_credit_install_tokens(): void
    {
        $meal = Meal::firstOrFail();

        $res = $this->postJson('/api/v1/customer/orders', [
            'name' => 'New Guest',
            'phone' => '+15551112222',
            'email' => 'newguest@example.com',
            'order_type' => 'pickup',
            'payment_method' => 'card',
            'items' => [['meal_id' => $meal->id, 'quantity' => 1]],
        ], ['X-Tenant-Slug' => 'pilot']);

        $res->assertCreated();
        $this->assertTrue($res->json('is_new_customer'));
        $this->assertTrue($res->json('install_claim_eligible'));
        $this->assertSame(200, (int) $res->json('install_claim_points'));

        $customer = Customer::where('phone', '+15551112222')->firstOrFail();
        $account = LoyaltyAccount::where('customer_id', $customer->id)->first();
        $this->assertTrue($account === null || (int) $account->points_balance === 0 || $account->install_claimed_at === null);
        if ($account) {
            $this->assertNull($account->install_claimed_at);
        }
    }

    public function test_claim_install_credits_once_enrolls_and_marks_crm_app_installed(): void
    {
        Mail::fake();
        $meal = Meal::firstOrFail();

        $order = $this->postJson('/api/v1/customer/orders', [
            'name' => 'Claimer',
            'phone' => '+15553334444',
            'email' => 'claimer@example.com',
            'order_type' => 'pickup',
            'payment_method' => 'card',
            'items' => [['meal_id' => $meal->id, 'quantity' => 1]],
        ], ['X-Tenant-Slug' => 'pilot']);
        $order->assertCreated();
        $customerId = $order->json('customer_id');

        $claim = $this->postJson('/api/v1/customer/loyalty/claim-install', [
            'customer_id' => $customerId,
            'phone' => '+15553334444',
        ], ['X-Tenant-Slug' => 'pilot']);
        $claim->assertOk();
        $this->assertFalse($claim->json('already_claimed'));
        $this->assertSame(200, (int) $claim->json('points_awarded'));
        $this->assertSame(200, (int) $claim->json('loyalty.points_balance'));
        $this->assertSame('active', $claim->json('loyalty.membership_status'));
        $this->assertSame('pwa_install', $claim->json('loyalty.enrollment_source'));
        $this->assertNotNull($claim->json('loyalty.install_claimed_at'));
        $this->assertNotNull($claim->json('customer.app_installed_at'));

        Mail::assertSent(LoyaltyCustomerMail::class, function (LoyaltyCustomerMail $mail) {
            return str_contains($mail->subjectLine, 'Welcome to')
                && str_contains($mail->bodyText, '200');
        });

        $again = $this->postJson('/api/v1/customer/loyalty/claim-install', [
            'customer_id' => $customerId,
            'phone' => '+15553334444',
        ], ['X-Tenant-Slug' => 'pilot']);
        $again->assertOk();
        $this->assertTrue($again->json('already_claimed'));
        $this->assertSame(0, (int) $again->json('points_awarded'));
        $this->assertSame(200, (int) $again->json('loyalty.points_balance'));

        $owner = User::where('email', 'owner@khayaos.com')->firstOrFail();
        $this->actingAs($owner, 'sanctum');
        $crm = $this->getJson('/api/v1/customers', ['X-Tenant-Slug' => 'pilot']);
        $crm->assertOk();
        $row = collect($crm->json('customers'))->firstWhere('id', $customerId);
        $this->assertNotNull($row);
        $this->assertTrue((bool) ($row['app_installed'] ?? false));
    }

    public function test_welcome_email_uses_tenant_template_override(): void
    {
        Mail::fake();
        $owner = User::where('email', 'owner@khayaos.com')->firstOrFail();
        $this->actingAs($owner, 'sanctum');

        $settings = $this->patchJson('/api/v1/loyalty/settings', [
            'install_claim_points' => 250,
            'install_welcome_subject' => 'Welcome to "{{restaurant_name}}" family',
            'install_welcome_body' => 'You earned {{tokens}} tokens at {{restaurant_name}}.',
        ], ['X-Tenant-Slug' => 'pilot']);
        $settings->assertOk();
        $this->assertSame(250, (int) $settings->json('settings.install_claim_points'));

        $meal = Meal::firstOrFail();
        $order = $this->postJson('/api/v1/customer/orders', [
            'name' => 'Template Guest',
            'phone' => '+15556667777',
            'email' => 'template@example.com',
            'order_type' => 'pickup',
            'payment_method' => 'card',
            'items' => [['meal_id' => $meal->id, 'quantity' => 1]],
        ], ['X-Tenant-Slug' => 'pilot']);
        $order->assertCreated();

        $claim = $this->postJson('/api/v1/customer/loyalty/claim-install', [
            'customer_id' => $order->json('customer_id'),
            'phone' => '+15556667777',
        ], ['X-Tenant-Slug' => 'pilot']);
        $claim->assertOk();
        $this->assertSame(250, (int) $claim->json('points_awarded'));

        Mail::assertSent(LoyaltyCustomerMail::class, function (LoyaltyCustomerMail $mail) {
            return str_contains($mail->subjectLine, 'family')
                && str_contains($mail->bodyText, '250 tokens');
        });
    }

    public function test_welcome_email_sends_when_email_added_after_claim(): void
    {
        Mail::fake();
        $meal = Meal::firstOrFail();

        $order = $this->postJson('/api/v1/customer/orders', [
            'name' => 'Late Email',
            'phone' => '+15558889999',
            'order_type' => 'pickup',
            'payment_method' => 'card',
            'items' => [['meal_id' => $meal->id, 'quantity' => 1]],
        ], ['X-Tenant-Slug' => 'pilot']);
        $order->assertCreated();
        $customerId = $order->json('customer_id');

        $claim = $this->postJson('/api/v1/customer/loyalty/claim-install', [
            'customer_id' => $customerId,
            'phone' => '+15558889999',
        ], ['X-Tenant-Slug' => 'pilot']);
        $claim->assertOk();
        Mail::assertNothingSent();

        $withEmail = $this->postJson('/api/v1/customer/loyalty/claim-install', [
            'customer_id' => $customerId,
            'phone' => '+15558889999',
            'email' => 'late@example.com',
        ], ['X-Tenant-Slug' => 'pilot']);
        $withEmail->assertOk();
        $this->assertTrue($withEmail->json('already_claimed'));
        $this->assertTrue($withEmail->json('welcome_email_sent'));

        Mail::assertSent(LoyaltyCustomerMail::class);
    }

    public function test_returning_customer_second_order_not_install_claim_eligible(): void
    {
        $meal = Meal::firstOrFail();
        $phone = '+15550001112';

        $first = $this->postJson('/api/v1/customer/orders', [
            'name' => 'Returner',
            'phone' => $phone,
            'order_type' => 'pickup',
            'payment_method' => 'card',
            'items' => [['meal_id' => $meal->id, 'quantity' => 1]],
        ], ['X-Tenant-Slug' => 'pilot']);
        $first->assertCreated();
        $this->assertTrue($first->json('is_new_customer'));

        $second = $this->postJson('/api/v1/customer/orders', [
            'name' => 'Returner',
            'phone' => $phone,
            'order_type' => 'pickup',
            'payment_method' => 'card',
            'items' => [['meal_id' => $meal->id, 'quantity' => 1]],
        ], ['X-Tenant-Slug' => 'pilot']);
        $second->assertCreated();
        $this->assertFalse($second->json('is_new_customer'));
        $this->assertFalse($second->json('install_claim_eligible'));
    }
}
