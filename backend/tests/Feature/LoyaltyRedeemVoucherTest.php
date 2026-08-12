<?php

namespace Tests\Feature;

use App\Modules\Auth\Domain\Models\User;
use App\Modules\CRM\Domain\Models\Customer;
use App\Modules\Loyalty\Domain\Models\LoyaltyAccount;
use App\Modules\Loyalty\Domain\Models\LoyaltyRedemptionVoucher;
use App\Modules\RevenueRecovery\Domain\Models\CustomerEmailOtp;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

class LoyaltyRedeemVoucherTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed();
    }

    /**
     * @return array{token: string, customer: Customer}
     */
    private function loginCustomer(string $phone = '+15551238888', string $email = 'voucher@example.com'): array
    {
        Mail::fake();

        $customer = Customer::firstOrCreate(
            ['phone' => $phone, 'tenant_id' => \App\Modules\Auth\Domain\Models\Tenant::where('slug', 'pilot')->value('id')],
            ['name' => 'Voucher User', 'email' => $email],
        );

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

    private function activeAccount(Customer $customer, int $points = 200, int $stamps = 8): LoyaltyAccount
    {
        return LoyaltyAccount::updateOrCreate(
            ['customer_id' => $customer->id, 'tenant_id' => $customer->tenant_id],
            [
                'points_balance' => $points,
                'stamps_balance' => $stamps,
                'tier' => 'bronze',
                'membership_status' => 'active',
                'enrolled_at' => now(),
                'created_at' => now(),
            ],
        );
    }

    public function test_customer_redeem_creates_pending_voucher_and_kitchen_can_fulfil(): void
    {
        $auth = $this->loginCustomer();
        $this->activeAccount($auth['customer'], 120, 0);

        $redeem = $this->postJson('/api/v1/customer/loyalty/redeem', [
            'points' => 40,
        ], [
            'X-Tenant-Slug' => 'pilot',
            'X-Customer-Session' => $auth['token'],
        ]);
        $redeem->assertOk();
        $this->assertSame(80, (int) $redeem->json('loyalty.points_balance'));
        $this->assertSame('pending', $redeem->json('voucher.status'));
        $voucherId = $redeem->json('voucher.id');
        $code = $redeem->json('voucher.code');
        $this->assertMatchesRegularExpression('/^[A-Z2-9]{6}$/', $code);

        $second = $this->postJson('/api/v1/customer/loyalty/redeem', [
            'points' => 10,
        ], [
            'X-Tenant-Slug' => 'pilot',
            'X-Customer-Session' => $auth['token'],
        ]);
        $second->assertStatus(422);

        $owner = User::where('email', 'owner@khayaos.com')->firstOrFail();
        $this->actingAs($owner, 'sanctum');

        $list = $this->getJson('/api/v1/kitchen/loyalty-vouchers', ['X-Tenant-Slug' => 'pilot']);
        $list->assertOk();
        $this->assertSame($voucherId, $list->json('vouchers.0.id'));

        $fulfil = $this->postJson("/api/v1/kitchen/loyalty-vouchers/{$voucherId}/fulfil", [], [
            'X-Tenant-Slug' => 'pilot',
        ]);
        $fulfil->assertOk();
        $this->assertSame('fulfilled', $fulfil->json('voucher.status'));
        $this->assertSame(80, (int) LoyaltyAccount::where('customer_id', $auth['customer']->id)->value('points_balance'));
        $this->assertDatabaseHas('loyalty_redemption_vouchers', [
            'id' => $voucherId,
            'status' => 'fulfilled',
            'code' => $code,
        ]);
    }

    public function test_customer_can_cancel_pending_voucher_and_points_are_returned(): void
    {
        $auth = $this->loginCustomer('+15551238889', 'cancel-voucher@example.com');
        $this->activeAccount($auth['customer'], 90, 0);

        $redeem = $this->postJson('/api/v1/customer/loyalty/redeem', [
            'points' => 30,
        ], [
            'X-Tenant-Slug' => 'pilot',
            'X-Customer-Session' => $auth['token'],
        ])->assertOk();

        $id = $redeem->json('voucher.id');
        $this->assertSame(60, (int) $redeem->json('loyalty.points_balance'));

        $cancel = $this->postJson("/api/v1/customer/loyalty/vouchers/{$id}/cancel", [], [
            'X-Tenant-Slug' => 'pilot',
            'X-Customer-Session' => $auth['token'],
        ]);
        $cancel->assertOk();
        $this->assertSame('cancelled', $cancel->json('voucher.status'));
        $this->assertSame(90, (int) $cancel->json('loyalty.points_balance'));
    }

    public function test_package_redeem_holds_stamps_until_staff_fulfil(): void
    {
        $auth = $this->loginCustomer('+15551238890', 'stamp-voucher@example.com');
        $this->activeAccount($auth['customer'], 10, 10);
        $owner = User::where('email', 'owner@khayaos.com')->firstOrFail();
        $this->actingAs($owner, 'sanctum');

        $pkg = $this->postJson('/api/v1/loyalty/packages', [
            'name' => 'Free drink card',
            'package_type' => 'stamp',
            'goal_value' => 5,
            'reward_type' => 'free_meal',
            'reward_label' => 'Free drink',
        ], ['X-Tenant-Slug' => 'pilot']);
        $pkg->assertCreated();
        $packageId = $pkg->json('package.id');

        $redeem = $this->postJson('/api/v1/customer/loyalty/redeem', [
            'package_id' => $packageId,
        ], [
            'X-Tenant-Slug' => 'pilot',
            'X-Customer-Session' => $auth['token'],
        ]);
        $redeem->assertOk();
        $this->assertSame(5, (int) $redeem->json('loyalty.stamps_balance'));
        $this->assertSame('Free drink', $redeem->json('voucher.reward_label'));
        $this->assertSame(5, (int) $redeem->json('voucher.stamps'));

        $chef = User::create([
            'tenant_id' => $owner->tenant_id,
            'name' => 'Chef Voucher',
            'email' => 'chef.voucher@example.test',
            'password' => 'password123',
            'role' => 'kitchen',
            'status' => 'active',
            'email_verified_at' => now(),
        ]);
        $this->actingAs($chef, 'sanctum');
        $this->postJson('/api/v1/kitchen/loyalty-vouchers/'.$redeem->json('voucher.id').'/fulfil', [], [
            'X-Tenant-Slug' => 'pilot',
        ])->assertOk();

        $this->assertSame(5, (int) LoyaltyAccount::where('customer_id', $auth['customer']->id)->value('stamps_balance'));
        $this->assertSame('fulfilled', LoyaltyRedemptionVoucher::find($redeem->json('voucher.id'))->status);
    }

    public function test_staff_counter_redeem_still_deducts_without_voucher(): void
    {
        $owner = User::where('email', 'owner@khayaos.com')->firstOrFail();
        $this->actingAs($owner, 'sanctum');
        $customer = Customer::where('phone', '+1234567890')->firstOrFail();
        $this->activeAccount($customer, 80, 0);

        $this->postJson('/api/v1/loyalty/redeem', [
            'customer_id' => $customer->id,
            'points' => 20,
        ], ['X-Tenant-Slug' => 'pilot'])->assertOk();

        $this->assertSame(60, (int) LoyaltyAccount::where('customer_id', $customer->id)->value('points_balance'));
        $this->assertSame(0, LoyaltyRedemptionVoucher::query()->where('customer_id', $customer->id)->count());
    }

    public function test_expired_voucher_returns_points_on_next_list(): void
    {
        $auth = $this->loginCustomer('+15551238891', 'expire-voucher@example.com');
        $this->activeAccount($auth['customer'], 70, 0);

        $redeem = $this->postJson('/api/v1/customer/loyalty/redeem', [
            'points' => 25,
        ], [
            'X-Tenant-Slug' => 'pilot',
            'X-Customer-Session' => $auth['token'],
        ])->assertOk();

        $voucher = LoyaltyRedemptionVoucher::findOrFail($redeem->json('voucher.id'));
        $voucher->update(['expires_at' => now()->subMinute()]);

        $owner = User::where('email', 'owner@khayaos.com')->firstOrFail();
        $this->actingAs($owner, 'sanctum');
        $list = $this->getJson('/api/v1/loyalty/vouchers', ['X-Tenant-Slug' => 'pilot']);
        $list->assertOk();
        $this->assertSame([], $list->json('vouchers'));
        $this->assertSame(70, (int) LoyaltyAccount::where('customer_id', $auth['customer']->id)->value('points_balance'));
        $this->assertSame('expired', $voucher->fresh()->status);
    }
}
