<?php

namespace Tests\Feature;

use App\Modules\Auth\Domain\Models\User;
use App\Modules\CRM\Domain\Models\Customer;
use App\Modules\CRM\Domain\Models\CustomerAddress;
use App\Modules\CRM\Domain\Models\CustomerCustomMealRequest;
use App\Modules\Loyalty\Domain\Models\LoyaltyAccount;
use App\Modules\RevenueRecovery\Domain\Models\CustomerEmailOtp;
use App\Modules\RevenueRecovery\Mail\CustomerProximityOtpMail;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

class CustomerAccountSystemTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed();
    }

    private function loginCustomer(string $phone = '+15551230001', string $email = 'account@example.com'): array
    {
        Mail::fake();

        $customer = Customer::firstOrCreate(
            ['phone' => $phone, 'tenant_id' => \App\Modules\Auth\Domain\Models\Tenant::where('slug', 'pilot')->value('id')],
            ['name' => 'Account User', 'email' => $email],
        );
        if (! $customer->email) {
            $customer->update(['email' => $email]);
        }

        $this->postJson('/api/v1/customer/auth/request-otp', [
            'phone' => $phone,
            'email' => $email,
            'mode' => 'signin',
        ], ['X-Tenant-Slug' => 'pilot'])->assertOk();

        CustomerEmailOtp::where('phone', $phone)->where('purpose', 'account')
            ->latest('created_at')->firstOrFail()
            ->update(['otp_hash' => Hash::make('654321')]);

        $verify = $this->postJson('/api/v1/customer/auth/verify-otp', [
            'phone' => $phone,
            'otp' => '654321',
        ], ['X-Tenant-Slug' => 'pilot'])->assertOk();

        return [
            'token' => $verify->json('session_token'),
            'customer' => $customer->fresh(),
        ];
    }

    public function test_customer_otp_session_is_tenant_scoped(): void
    {
        Mail::fake();
        $auth = $this->loginCustomer();

        $me = $this->getJson('/api/v1/customer/account/me', [
            'X-Tenant-Slug' => 'pilot',
            'X-Customer-Session' => $auth['token'],
        ]);
        $me->assertOk();
        $this->assertSame($auth['customer']->id, $me->json('customer.id'));

        $this->getJson('/api/v1/customer/account/me', [
            'X-Tenant-Slug' => 'pilot',
        ])->assertUnauthorized();
    }

    public function test_profile_address_and_phone_change_ownership(): void
    {
        Mail::fake();
        $auth = $this->loginCustomer();

        $this->patchJson('/api/v1/customer/account/me', [
            'name' => 'Updated Name',
            'email' => 'updated@example.com',
        ], [
            'X-Tenant-Slug' => 'pilot',
            'X-Customer-Session' => $auth['token'],
        ])->assertOk();

        $this->assertSame('Updated Name', $auth['customer']->fresh()->name);

        $addr = $this->postJson('/api/v1/customer/account/addresses', [
            'line1' => '12 Kitchen Street',
            'city' => 'Abuja',
            'is_default' => true,
        ], [
            'X-Tenant-Slug' => 'pilot',
            'X-Customer-Session' => $auth['token'],
        ]);
        $addr->assertCreated();
        $this->assertDatabaseHas('customer_addresses', [
            'customer_id' => $auth['customer']->id,
            'line1' => '12 Kitchen Street',
        ]);

        $this->postJson('/api/v1/customer/account/phone/request-otp', [
            'phone' => '+15551239999',
        ], [
            'X-Tenant-Slug' => 'pilot',
            'X-Customer-Session' => $auth['token'],
        ])->assertOk();

        CustomerEmailOtp::where('phone', '+15551239999')->where('purpose', 'phone_change')
            ->latest('created_at')->firstOrFail()
            ->update(['otp_hash' => Hash::make('111222')]);

        $this->postJson('/api/v1/customer/account/phone/confirm', [
            'phone' => '+15551239999',
            'otp' => '111222',
        ], [
            'X-Tenant-Slug' => 'pilot',
            'X-Customer-Session' => $auth['token'],
        ])->assertOk();

        $this->assertSame('+15551239999', $auth['customer']->fresh()->phone);
    }

    public function test_customer_can_redeem_loyalty_points(): void
    {
        $auth = $this->loginCustomer('+15551230002', 'redeem@example.com');
        LoyaltyAccount::create([
            'tenant_id' => $auth['customer']->tenant_id,
            'customer_id' => $auth['customer']->id,
            'points_balance' => 500,
            'stamps_balance' => 0,
            'tier' => 'bronze',
            'membership_status' => 'active',
            'enrolled_at' => now(),
            'created_at' => now(),
        ]);

        $redeem = $this->postJson('/api/v1/customer/loyalty/redeem', [
            'points' => 50,
        ], [
            'X-Tenant-Slug' => 'pilot',
            'X-Customer-Session' => $auth['token'],
        ]);
        $redeem->assertOk();
        $this->assertSame(450, (int) $redeem->json('loyalty.points_balance'));
    }

    public function test_custom_meal_request_create_and_staff_status_update(): void
    {
        $auth = $this->loginCustomer('+15551230003', 'meal@example.com');

        $create = $this->postJson('/api/v1/customer/account/custom-meals', [
            'title' => 'Spice bowl',
            'message' => 'Extra pepper, no onion',
            'constraints' => 'Gluten free',
        ], [
            'X-Tenant-Slug' => 'pilot',
            'X-Customer-Session' => $auth['token'],
        ]);
        $create->assertCreated();
        $id = $create->json('request.id');

        $owner = User::where('email', 'owner@khayaos.com')->firstOrFail();
        $this->actingAs($owner, 'sanctum');

        $list = $this->getJson('/api/v1/custom-meal-requests', ['X-Tenant-Slug' => 'pilot']);
        $list->assertOk();
        $this->assertNotEmpty($list->json('requests'));

        $update = $this->patchJson('/api/v1/custom-meal-requests/'.$id, [
            'status' => 'acknowledged',
            'staff_note' => 'On it',
        ], ['X-Tenant-Slug' => 'pilot']);
        $update->assertOk();
        $this->assertSame('acknowledged', $update->json('request.status'));
        $this->assertDatabaseHas('customer_custom_meal_requests', [
            'id' => $id,
            'status' => CustomerCustomMealRequest::STATUS_ACKNOWLEDGED,
        ]);
    }

    public function test_signup_mode_creates_customer_and_sends_otp(): void
    {
        Mail::fake();

        $this->postJson('/api/v1/customer/auth/request-otp', [
            'phone' => '+15551238888',
            'email' => 'newacct@example.com',
            'name' => 'Brand New',
            'mode' => 'signup',
        ], ['X-Tenant-Slug' => 'pilot'])->assertOk();

        Mail::assertSent(CustomerProximityOtpMail::class);
        $this->assertDatabaseHas('customers', [
            'phone' => '+15551238888',
            'email' => 'newacct@example.com',
        ]);
    }

    public function test_signup_rejects_duplicate_phone_and_email(): void
    {
        Mail::fake();

        Customer::create([
            'tenant_id' => \App\Modules\Auth\Domain\Models\Tenant::where('slug', 'pilot')->value('id'),
            'name' => 'Existing',
            'phone' => '+15551237777',
            'email' => 'taken@example.com',
        ]);

        $this->postJson('/api/v1/customer/auth/request-otp', [
            'phone' => '+15551237777',
            'email' => 'fresh@example.com',
            'name' => 'Dup Phone',
            'mode' => 'signup',
        ], ['X-Tenant-Slug' => 'pilot'])
            ->assertStatus(422)
            ->assertJsonPath('details.phone.0', 'An account already exists with this phone number. Sign in instead.');

        $this->postJson('/api/v1/customer/auth/request-otp', [
            'phone' => '+15551239999',
            'email' => 'taken@example.com',
            'name' => 'Dup Email',
            'mode' => 'signup',
        ], ['X-Tenant-Slug' => 'pilot'])
            ->assertStatus(422)
            ->assertJsonPath('details.email.0', 'An account already exists with this email address. Sign in instead.');
    }
}
