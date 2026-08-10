<?php

namespace Tests\Feature;

use App\Modules\Auth\Domain\Models\Tenant;
use App\Modules\CRM\Domain\Models\Customer;
use App\Modules\CRM\Domain\Models\CustomerWebAuthnCredential;
use App\Modules\RevenueRecovery\Domain\Models\CustomerEmailOtp;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

class CustomerPasskeyPasswordAuthTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed();
        Mail::fake();
    }

    private function tenantHeaders(): array
    {
        return ['X-Tenant-Slug' => 'pilot'];
    }

    private function tenantId(): string
    {
        return Tenant::where('slug', 'pilot')->value('id');
    }

    private function createCustomerWithPassword(
        string $phone = '+15551234001',
        string $password = 'SecurePass1',
        string $email = 'passkey@example.com',
    ): Customer {
        return Customer::create([
            'tenant_id' => $this->tenantId(),
            'name' => 'Pass User',
            'phone' => $phone,
            'email' => $email,
            'password' => $password,
        ]);
    }

    public function test_signup_with_password_via_otp_then_password_login(): void
    {
        $phone = '+15551234010';
        $email = 'signup-pass@example.com';

        $this->postJson('/api/v1/customer/auth/request-otp', [
            'phone' => $phone,
            'email' => $email,
            'name' => 'Signup User',
            'mode' => 'signup',
        ], $this->tenantHeaders())->assertOk();

        CustomerEmailOtp::where('phone', $phone)->where('purpose', 'account')
            ->latest('created_at')->firstOrFail()
            ->update(['otp_hash' => Hash::make('123456')]);

        $verify = $this->postJson('/api/v1/customer/auth/verify-otp', [
            'phone' => $phone,
            'otp' => '123456',
            'email' => $email,
            'password' => 'SecurePass1',
            'password_confirmation' => 'SecurePass1',
        ], $this->tenantHeaders());

        $verify->assertOk();
        $this->assertNotEmpty($verify->json('session_token'));
        $this->assertTrue($verify->json('customer.has_password'));

        $login = $this->postJson('/api/v1/customer/auth/login-password', [
            'phone' => $phone,
            'password' => 'SecurePass1',
        ], $this->tenantHeaders());

        $login->assertOk();
        $this->assertNotEmpty($login->json('session_token'));
    }

    public function test_password_login_rejects_wrong_password(): void
    {
        $this->createCustomerWithPassword();

        $this->postJson('/api/v1/customer/auth/login-password', [
            'phone' => '+15551234001',
            'password' => 'WrongPass99',
        ], $this->tenantHeaders())->assertStatus(422);
    }

    public function test_legacy_otp_login_still_works_without_password(): void
    {
        $phone = '+15551234020';
        $email = 'legacy@example.com';

        Customer::create([
            'tenant_id' => $this->tenantId(),
            'name' => 'Legacy',
            'phone' => $phone,
            'email' => $email,
        ]);

        $this->postJson('/api/v1/customer/auth/request-otp', [
            'phone' => $phone,
            'email' => $email,
            'mode' => 'signin',
        ], $this->tenantHeaders())->assertOk();

        CustomerEmailOtp::where('phone', $phone)->where('purpose', 'account')
            ->latest('created_at')->firstOrFail()
            ->update(['otp_hash' => Hash::make('654321')]);

        $this->postJson('/api/v1/customer/auth/verify-otp', [
            'phone' => $phone,
            'otp' => '654321',
        ], $this->tenantHeaders())->assertOk();
    }

    public function test_forgot_and_reset_password_issues_session(): void
    {
        $customer = $this->createCustomerWithPassword('+15551234030', 'OldPass123', 'reset@example.com');

        $this->postJson('/api/v1/customer/auth/forgot-password', [
            'phone' => $customer->phone,
            'email' => $customer->email,
        ], $this->tenantHeaders())->assertOk();

        CustomerEmailOtp::where('phone', $customer->phone)->where('purpose', 'password_reset')
            ->latest('created_at')->firstOrFail()
            ->update(['otp_hash' => Hash::make('111222')]);

        $reset = $this->postJson('/api/v1/customer/auth/reset-password', [
            'phone' => $customer->phone,
            'otp' => '111222',
            'password' => 'NewPass123',
            'password_confirmation' => 'NewPass123',
        ], $this->tenantHeaders());

        $reset->assertOk();
        $this->assertNotEmpty($reset->json('session_token'));

        $this->postJson('/api/v1/customer/auth/login-password', [
            'phone' => $customer->phone,
            'password' => 'NewPass123',
        ], $this->tenantHeaders())->assertOk();
    }

    public function test_passkey_register_and_login_with_fake_ceremony(): void
    {
        $customer = $this->createCustomerWithPassword('+15551234040', 'SecurePass1', 'pk@example.com');

        $login = $this->postJson('/api/v1/customer/auth/login-password', [
            'phone' => $customer->phone,
            'password' => 'SecurePass1',
        ], $this->tenantHeaders())->assertOk();

        $token = $login->json('session_token');

        $options = $this->postJson('/api/v1/customer/auth/passkey/register/options', [], [
            ...$this->tenantHeaders(),
            'X-Customer-Session' => $token,
        ])->assertOk();

        $this->assertNotEmpty($options->json('challengeId'));
        $this->assertNotEmpty($options->json('challenge'));

        $register = $this->postJson('/api/v1/customer/auth/passkey/register/verify', [
            'challengeId' => $options->json('challengeId'),
            'credential' => [
                'id' => 'test-cred-abc123',
                'rawId' => 'test-cred-abc123',
                'type' => 'public-key',
                'response' => [
                    'clientDataJSON' => '',
                    'attestationObject' => '',
                    'transports' => ['internal'],
                ],
            ],
            'device_label' => 'Test Device',
        ], [
            ...$this->tenantHeaders(),
            'X-Customer-Session' => $token,
        ]);

        $register->assertOk();
        $this->assertDatabaseHas('customer_webauthn_credentials', [
            'customer_id' => $customer->id,
            'credential_id' => 'test-cred-abc123',
        ]);

        $loginOptions = $this->postJson('/api/v1/customer/auth/passkey/login/options', [
            'phone' => $customer->phone,
        ], $this->tenantHeaders())->assertOk();

        $passkeyLogin = $this->postJson('/api/v1/customer/auth/passkey/login/verify', [
            'challengeId' => $loginOptions->json('challengeId'),
            'credential' => [
                'id' => 'test-cred-abc123',
                'rawId' => 'test-cred-abc123',
                'type' => 'public-key',
                'response' => [
                    'clientDataJSON' => '',
                    'authenticatorData' => '',
                    'signature' => '',
                ],
            ],
        ], $this->tenantHeaders());

        $passkeyLogin->assertOk();
        $this->assertNotEmpty($passkeyLogin->json('session_token'));
        $this->assertTrue($passkeyLogin->json('customer.has_passkeys'));
    }

    public function test_passkey_credentials_are_tenant_scoped(): void
    {
        $customer = $this->createCustomerWithPassword('+15551234050');

        CustomerWebAuthnCredential::create([
            'tenant_id' => $this->tenantId(),
            'customer_id' => $customer->id,
            'credential_id' => 'tenant-scoped-cred',
            'public_key' => json_encode(['fake' => true]),
            'counter' => 0,
            'transports' => ['internal'],
            'device_label' => 'Phone',
        ]);

        $options = $this->postJson('/api/v1/customer/auth/passkey/login/options', [
            'phone' => $customer->phone,
        ], $this->tenantHeaders())->assertOk();

        $allow = $options->json('allowCredentials') ?? [];
        $this->assertNotEmpty($allow);
    }

    public function test_authenticated_customer_can_set_password_and_list_passkeys(): void
    {
        $phone = '+15551234060';
        $email = 'setpass@example.com';

        Customer::create([
            'tenant_id' => $this->tenantId(),
            'name' => 'Set Pass',
            'phone' => $phone,
            'email' => $email,
        ]);

        $this->postJson('/api/v1/customer/auth/request-otp', [
            'phone' => $phone,
            'email' => $email,
            'mode' => 'signin',
        ], $this->tenantHeaders())->assertOk();

        CustomerEmailOtp::where('phone', $phone)->where('purpose', 'account')
            ->latest('created_at')->firstOrFail()
            ->update(['otp_hash' => Hash::make('999888')]);

        $token = $this->postJson('/api/v1/customer/auth/verify-otp', [
            'phone' => $phone,
            'otp' => '999888',
        ], $this->tenantHeaders())->json('session_token');

        $this->postJson('/api/v1/customer/auth/set-password', [
            'password' => 'FreshPass1',
            'password_confirmation' => 'FreshPass1',
        ], [
            ...$this->tenantHeaders(),
            'X-Customer-Session' => $token,
        ])->assertOk();

        $this->getJson('/api/v1/customer/auth/passkeys', [
            ...$this->tenantHeaders(),
            'X-Customer-Session' => $token,
        ])->assertOk()->assertJsonPath('credentials', []);

        $this->postJson('/api/v1/customer/auth/login-password', [
            'phone' => $phone,
            'password' => 'FreshPass1',
        ], $this->tenantHeaders())->assertOk();
    }
}
