<?php

namespace Tests\Feature;

use App\Modules\Auth\Domain\Models\User;
use App\Modules\Auth\Mail\EmailVerificationMail;
use App\Modules\Auth\Mail\PasswordResetMail;
use App\Modules\Platform\Mail\WelcomeOwnerMail;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

class EmailVerificationAndPasswordResetTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed();
        Mail::fake();
    }

    public function test_unverified_owner_cannot_login(): void
    {
        $owner = $this->createUnverifiedOwner();

        $response = $this->postJson('/api/v1/auth/login', [
            'email' => $owner->email,
            'password' => 'SecurePass1!',
            'tenant_slug' => 'verify-test-kitchen',
        ]);

        $response->assertStatus(422);
        $response->assertJsonPath(
            'details.email.0',
            'Please verify your email before signing in. Check your inbox for the confirmation link.',
        );
    }

    public function test_owner_can_verify_email_and_then_login(): void
    {
        $owner = $this->createUnverifiedOwner();
        $token = $this->extractVerificationTokenFromMail($owner->email);

        $verifyResponse = $this->postJson('/api/v1/auth/verify-email', [
            'token' => $token,
            'email' => $owner->email,
        ]);

        $verifyResponse->assertOk();
        $verifyResponse->assertJsonPath('already_verified', false);
        $this->assertNotNull($owner->fresh()->email_verified_at);

        Mail::assertSent(WelcomeOwnerMail::class);

        $loginResponse = $this->postJson('/api/v1/auth/login', [
            'email' => $owner->email,
            'password' => 'SecurePass1!',
            'tenant_slug' => 'verify-test-kitchen',
        ]);

        $loginResponse->assertOk();
        $loginResponse->assertJsonPath('user.role', 'owner');
    }

    public function test_resend_verification_sends_new_email(): void
    {
        $owner = $this->createUnverifiedOwner();

        $response = $this->postJson('/api/v1/auth/resend-verification', [
            'email' => $owner->email,
            'tenant_slug' => 'verify-test-kitchen',
        ]);

        $response->assertOk();
        Mail::assertSent(EmailVerificationMail::class, 2);
    }

    public function test_forgot_password_sends_reset_link_for_verified_owner(): void
    {
        $owner = User::where('email', 'owner@khayaos.com')->firstOrFail();

        $response = $this->postJson('/api/v1/auth/forgot-password', [
            'email' => $owner->email,
            'tenant_slug' => 'pilot',
        ]);

        $response->assertOk();
        Mail::assertSent(PasswordResetMail::class);
    }

    public function test_owner_can_reset_password_with_valid_token(): void
    {
        $owner = User::where('email', 'owner@khayaos.com')->firstOrFail();
        $plainToken = 'reset-token-123456';

        DB::table('password_reset_tokens')->insert([
            'email' => $owner->email,
            'token' => Hash::make($plainToken),
            'created_at' => now(),
        ]);

        $response = $this->postJson('/api/v1/auth/reset-password', [
            'email' => $owner->email,
            'token' => $plainToken,
            'password' => 'new-password-123',
            'password_confirmation' => 'new-password-123',
            'tenant_slug' => 'pilot',
        ]);

        $response->assertOk();
        $this->assertTrue(Hash::check('new-password-123', $owner->fresh()->password));
    }

    public function test_staff_create_rejects_globally_registered_email(): void
    {
        $owner = User::where('email', 'owner@khayaos.com')->firstOrFail();
        $token = $owner->createToken('test')->plainTextToken;

        $response = $this->postJson('/api/v1/staff', [
            'name' => 'Duplicate Email Staff',
            'email' => 'admin@khayaos.com',
            'password' => 'password123',
            'role' => 'staff',
        ], [
            'Authorization' => "Bearer {$token}",
            'X-Tenant-Slug' => 'pilot',
        ]);

        $response->assertStatus(422);
        $response->assertJsonPath('details.email.0', 'This email is already registered.');
    }

    private function createUnverifiedOwner(): User
    {
        $plan = \App\Modules\Pricing\Domain\Models\Plan::where('slug', 'starter')->firstOrFail();

        $this->postJson('/api/v1/signup', [
            'restaurant_name' => 'Verify Test Kitchen',
            'legal_business_name' => 'Verify Test Kitchen Ltd',
            'business_type' => 'restaurant',
            'slug' => 'verify-test-kitchen',
            'country' => 'United Kingdom',
            'city' => 'London',
            'street_address' => '1 Test Lane',
            'postal_code' => 'E1 1AA',
            'timezone' => 'Europe/London',
            'currency' => 'GBP',
            'owner_name' => 'Verify Owner',
            'owner_email' => 'verify-owner@testkitchen.test',
            'owner_phone' => '+447700900444',
            'owner_role_title' => 'Owner',
            'owner_password' => 'SecurePass1!',
            'owner_password_confirmation' => 'SecurePass1!',
            'plan_id' => $plan->id,
            'order_types' => ['pickup'],
            'estimated_daily_orders' => 20,
            'staff_count' => 2,
            'branch_count' => 1,
            'terms_accepted' => true,
        ])->assertCreated();

        Mail::assertSent(EmailVerificationMail::class);

        return User::where('email', 'verify-owner@testkitchen.test')->firstOrFail();
    }

    private function extractVerificationTokenFromMail(string $email): string
    {
        $token = null;

        Mail::assertSent(EmailVerificationMail::class, function (EmailVerificationMail $mail) use ($email, &$token) {
            if (! str_contains($mail->verifyUrl, urlencode($email)) && ! str_contains($mail->verifyUrl, $email)) {
                return false;
            }

            parse_str((string) parse_url($mail->verifyUrl, PHP_URL_QUERY), $query);
            $token = $query['token'] ?? null;

            return is_string($token) && $token !== '';
        });

        return $token;
    }
}
