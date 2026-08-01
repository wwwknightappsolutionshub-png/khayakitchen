<?php

namespace Tests\Feature;

use App\Modules\Auth\Domain\Models\User;
use App\Modules\Auth\Mail\EmailVerificationMail;
use App\Modules\Auth\Mail\PasswordResetMail;
use App\Modules\Auth\Mail\StaffInviteMail;
use App\Modules\Pricing\Mail\TenantReferralInviteMail;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

/**
 * Phase B contract: Ops path prefix, dual SWs, legacy redirects, backend deep links.
 */
class OpsPhaseBContractTest extends TestCase
{
    use RefreshDatabase;

    private function frontendPublic(string $relative): string
    {
        return dirname(__DIR__, 3)
            .DIRECTORY_SEPARATOR.'frontend'
            .DIRECTORY_SEPARATOR.'public'
            .DIRECTORY_SEPARATOR.str_replace('/', DIRECTORY_SEPARATOR, $relative);
    }

    private function frontendLib(string $relative): string
    {
        return dirname(__DIR__, 3)
            .DIRECTORY_SEPARATOR.'frontend'
            .DIRECTORY_SEPARATOR.'lib'
            .DIRECTORY_SEPARATOR.str_replace('/', DIRECTORY_SEPARATOR, $relative);
    }

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed();
    }

    public function test_dual_service_workers_exist_with_matching_scopes(): void
    {
        $customerSw = $this->frontendPublic('sw.js');
        $opsSw = $this->frontendPublic('ops/sw.js');
        $this->assertFileExists($customerSw);
        $this->assertFileExists($opsSw);

        $customer = (string) file_get_contents($customerSw);
        $ops = (string) file_get_contents($opsSw);

        $this->assertStringContainsString('/icon-192.png', $customer);
        $this->assertStringNotContainsString('/ops/orders', $customer);
        $this->assertStringContainsString('/icon-ops-192.png', $ops);
        $this->assertStringContainsString('/ops/orders', $ops);
        $this->assertStringContainsString('KhayaOS Ops', $ops);
    }

    public function test_legacy_ops_redirect_table_covers_critical_paths(): void
    {
        $path = $this->frontendLib('ops-paths.ts');
        $this->assertFileExists($path);
        $source = (string) file_get_contents($path);

        $required = [
            'source: "/login", destination: OPS_ROUTES.login',
            'source: "/orders", destination: OPS_ROUTES.orders',
            'source: "/kitchen", destination: OPS_ROUTES.kitchen',
            'source: "/platform/:path*"',
            'source: "/get-started", destination: OPS_ROUTES.getStarted',
            'source: "/pricing", destination: OPS_ROUTES.pricing',
            'source: "/ops", destination: OPS_ROUTES.login',
        ];

        foreach ($required as $needle) {
            $this->assertStringContainsString(
                $needle,
                $source,
                "Missing legacy redirect contract: {$needle}",
            );
        }
    }

    public function test_staff_invite_login_url_uses_ops_prefix(): void
    {
        Mail::fake();

        $owner = User::where('email', 'owner@khayaos.com')->firstOrFail();
        $token = $owner->createToken('test')->plainTextToken;

        $this->postJson('/api/v1/staff', [
            'name' => 'Phase B Staff',
            'email' => 'phaseb.staff@example.test',
            'password' => 'password123',
            'role' => 'staff',
        ], [
            'Authorization' => "Bearer {$token}",
            'X-Tenant-Slug' => 'pilot',
        ])->assertCreated();

        Mail::assertSent(StaffInviteMail::class, function (StaffInviteMail $mail) {
            return str_contains($mail->loginUrl, '/ops/login');
        });
    }

    public function test_referral_invite_url_uses_ops_get_started(): void
    {
        Mail::fake();

        $owner = User::where('email', 'owner@khayaos.com')->firstOrFail();
        $token = $owner->createToken('test')->plainTextToken;

        $this->postJson('/api/v1/referrals/invite', [
            'email' => 'phaseb.ref@example.com',
            'phone' => '+447700901111',
            'name' => 'Phase B Prospect',
            'channel' => 'email',
        ], [
            'Authorization' => "Bearer {$token}",
            'X-Tenant-Slug' => 'pilot',
        ])->assertCreated();

        Mail::assertSent(TenantReferralInviteMail::class, function (TenantReferralInviteMail $mail) {
            return str_contains($mail->inviteUrl, '/ops/get-started');
        });

        $me = $this->getJson('/api/v1/referrals', [
            'Authorization' => "Bearer {$token}",
            'X-Tenant-Slug' => 'pilot',
        ]);
        $me->assertOk();
        $this->assertStringContainsString('/ops/get-started', (string) $me->json('link'));
    }

    public function test_password_reset_and_verify_urls_use_ops_prefix(): void
    {
        Mail::fake();

        $owner = User::where('email', 'owner@khayaos.com')->firstOrFail();

        $this->postJson('/api/v1/auth/forgot-password', [
            'email' => $owner->email,
            'tenant_slug' => 'pilot',
        ])->assertOk();

        Mail::assertSent(PasswordResetMail::class, function (PasswordResetMail $mail) {
            return str_contains($mail->resetUrl, '/ops/reset-password');
        });
    }

    public function test_accounts_orders_path_uses_ops_prefix(): void
    {
        $path = dirname(__DIR__, 3)
            .DIRECTORY_SEPARATOR.'backend'
            .DIRECTORY_SEPARATOR.'app'
            .DIRECTORY_SEPARATOR.'Modules'
            .DIRECTORY_SEPARATOR.'Orders'
            .DIRECTORY_SEPARATOR.'Application'
            .DIRECTORY_SEPARATOR.'Services'
            .DIRECTORY_SEPARATOR.'PaymentAccountsService.php';
        $this->assertFileExists($path);
        $source = (string) file_get_contents($path);
        $this->assertStringContainsString("'orders_path' => '/ops/orders'", $source);
    }

    public function test_chat_push_urls_use_ops_inbox(): void
    {
        $path = dirname(__DIR__, 3)
            .DIRECTORY_SEPARATOR.'backend'
            .DIRECTORY_SEPARATOR.'app'
            .DIRECTORY_SEPARATOR.'Modules'
            .DIRECTORY_SEPARATOR.'Engagement'
            .DIRECTORY_SEPARATOR.'Application'
            .DIRECTORY_SEPARATOR.'Services'
            .DIRECTORY_SEPARATOR.'ChatService.php';
        $this->assertFileExists($path);
        $source = (string) file_get_contents($path);
        $this->assertStringContainsString("'url' => '/ops/inbox'", $source);
        $this->assertStringNotContainsString("'url' => '/inbox'", $source);
    }

    public function test_welcome_owner_login_uses_ops_after_verification(): void
    {
        Mail::fake();

        $plan = \App\Modules\Pricing\Domain\Models\Plan::where('slug', 'growth')->firstOrFail();

        $signup = $this->postJson('/api/v1/signup', [
            'restaurant_name' => 'Phase B Kitchen',
            'legal_business_name' => 'Phase B Kitchen Ltd',
            'business_type' => 'restaurant',
            'slug' => 'phase-b-kitchen',
            'country' => 'United Kingdom',
            'city' => 'London',
            'street_address' => '1 Test St',
            'postal_code' => 'E1 1AA',
            'timezone' => 'Europe/London',
            'currency' => 'GBP',
            'owner_name' => 'Phase Owner',
            'owner_email' => 'phaseb.owner@example.test',
            'owner_phone' => '+447700902222',
            'owner_role_title' => 'Owner',
            'owner_password' => 'SecurePass1!',
            'owner_password_confirmation' => 'SecurePass1!',
            'plan_id' => $plan->id,
            'order_types' => ['pickup'],
            'estimated_daily_orders' => 20,
            'staff_count' => 2,
            'branch_count' => 1,
            'terms_accepted' => true,
        ]);
        $signup->assertCreated();

        Mail::assertSent(EmailVerificationMail::class, function (EmailVerificationMail $mail) {
            return str_contains($mail->verifyUrl, '/ops/verify-email');
        });
    }
}
