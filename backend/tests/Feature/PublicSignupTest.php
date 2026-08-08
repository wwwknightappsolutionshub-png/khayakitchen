<?php

namespace Tests\Feature;

use App\Modules\Auth\Mail\EmailVerificationMail;
use App\Modules\Auth\Domain\Models\Tenant;
use App\Modules\Auth\Domain\Models\User;
use App\Modules\Notifications\Infrastructure\WhatsApp\Contracts\WhatsAppProviderInterface;
use App\Modules\Notifications\Jobs\SendSignupWelcomeWhatsAppJob;
use App\Modules\Platform\Mail\WelcomeOwnerMail;
use App\Modules\Pricing\Domain\Models\Plan;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\Storage;
use Mockery;
use Tests\TestCase;

class PublicSignupTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed();
    }

    public function test_signup_check_slug_and_email_availability(): void
    {
        $takenSlug = $this->getJson('/api/v1/signup/check-slug?slug=pilot');
        $takenSlug->assertOk();
        $takenSlug->assertJsonPath('available', false);

        $freeSlug = $this->getJson('/api/v1/signup/check-slug?slug=brand-new-kitchen-xyz');
        $freeSlug->assertOk();
        $freeSlug->assertJsonPath('available', true);

        $takenEmail = $this->getJson('/api/v1/signup/check-email?email=owner@khayaos.com');
        $takenEmail->assertOk();
        $takenEmail->assertJsonPath('available', false);
        $takenEmail->assertJsonPath('message', 'An account with this email already exists.');

        $freeEmail = $this->getJson('/api/v1/signup/check-email?email=fresh-owner@example.test');
        $freeEmail->assertOk();
        $freeEmail->assertJsonPath('available', true);
    }

    public function test_public_signup_provisions_tenant_plan_and_verification_email(): void
    {
        Mail::fake();

        $plan = Plan::where('slug', 'growth')->firstOrFail();

        $response = $this->postJson('/api/v1/signup', [
            'restaurant_name' => 'Sunrise Kitchen',
            'legal_business_name' => 'Sunrise Kitchen Ltd',
            'business_type' => 'restaurant',
            'company_registration_number' => 'RC123456',
            'tax_vat_number' => 'VAT998877',
            'slug' => 'sunrise-kitchen',
            'country' => 'United Kingdom',
            'city' => 'London',
            'street_address' => '12 Market Street',
            'postal_code' => 'E1 6AN',
            'timezone' => 'Europe/London',
            'currency' => 'GBP',
            'owner_name' => 'Ada Owner',
            'owner_email' => 'ada@sunrisekitchen.test',
            'owner_phone' => '+447700900123',
            'owner_role_title' => 'Managing Director',
            'owner_password' => 'SecurePass1!',
            'owner_password_confirmation' => 'SecurePass1!',
            'plan_id' => $plan->id,
            'order_types' => ['pickup', 'delivery'],
            'estimated_daily_orders' => 120,
            'staff_count' => 8,
            'branch_count' => 1,
            'average_order_value' => 18.5,
            'tagline' => 'Fresh food, fast service',
            'primary_color' => '#004D40',
            'secondary_color' => '#E07A5F',
            'terms_accepted' => true,
            'marketing_opt_in' => true,
        ]);

        $response->assertCreated();
        $response->assertJsonPath('message', 'Check your email to confirm your account before signing in.');
        $response->assertJsonPath('tenant.slug', 'sunrise-kitchen');

        $tenant = Tenant::where('slug', 'sunrise-kitchen')->firstOrFail();
        $this->assertNotNull($tenant->signup_metadata);
        $this->assertSame('London', $tenant->signup_metadata['city']);
        $this->assertSame('Fresh food, fast service', $tenant->signup_metadata['tagline']);

        $this->assertDatabaseHas('tenant_brandings', [
            'tenant_id' => $tenant->id,
            'restaurant_name' => 'Sunrise Kitchen',
        ]);

        $owner = User::where('email', 'ada@sunrisekitchen.test')->firstOrFail();
        $this->assertNull($owner->email_verified_at);

        $this->assertDatabaseHas('users', [
            'tenant_id' => $tenant->id,
            'email' => 'ada@sunrisekitchen.test',
            'role' => 'owner',
        ]);

        $this->assertDatabaseHas('tenant_subscriptions', [
            'tenant_id' => $tenant->id,
            'plan_id' => $plan->id,
        ]);

        Mail::assertSent(EmailVerificationMail::class, function (EmailVerificationMail $mail) {
            return $mail->tenantSlug === 'sunrise-kitchen'
                && str_contains($mail->verifyUrl, 'token=')
                && str_contains($mail->verifyUrl, 'email=ada%40sunrisekitchen.test');
        });
        Mail::assertNotSent(WelcomeOwnerMail::class);
    }

    public function test_signup_owner_can_login_after_email_verification(): void
    {
        Mail::fake();
        $platformWa = \App\Modules\Notifications\Domain\Models\PlatformWhatsAppSettings::query()->first()
            ?? new \App\Modules\Notifications\Domain\Models\PlatformWhatsAppSettings;
        $platformWa->fill([
            'enabled' => true,
            'provider' => 'genius',
            'api_key' => 'test-platform-key',
            'session_id' => 'test-platform-session',
            'base_url' => 'https://restapi.geniusdevel.com',
        ])->save();
        // Ensure welcome banner bytes/URL are on the same singleton settings row.
        app(\App\Modules\Notifications\Application\Services\PlatformWhatsAppWelcomeImageService::class)->ensureSeeded();
        $whatsAppMock = Mockery::mock(WhatsAppProviderInterface::class);
        $whatsAppMock->shouldReceive('send')
            ->once()
            ->withArgs(function (string $phone, string $message, array $context): bool {
                return str_contains($phone, '447700900222')
                    && str_contains($message, '*Welcome aboard, Harbor Owner*')
                    && str_contains($message, '*Harbor Bistro*')
                    && str_contains($message, '*Starter*')
                    && str_contains($message, 'Workspace slug: harbor-bistro')
                    && str_contains($message, 'Email: owner@harborbistro.test')
                    && str_contains($message, '/ops/login')
                    && (($context['type'] ?? null) === 'owner_welcome')
                    && filled($context['media_url'] ?? null)
                    && filled($context['media_base64'] ?? null);
            });
        $this->app->instance(WhatsAppProviderInterface::class, $whatsAppMock);

        $plan = Plan::where('slug', 'starter')->firstOrFail();

        $this->postJson('/api/v1/signup', [
            'restaurant_name' => 'Harbor Bistro',
            'legal_business_name' => 'Harbor Bistro Ltd',
            'business_type' => 'restaurant',
            'slug' => 'harbor-bistro',
            'country' => 'United Kingdom',
            'city' => 'Bristol',
            'street_address' => '3 Harbor Road',
            'postal_code' => 'BS1 4ST',
            'timezone' => 'Europe/London',
            'currency' => 'GBP',
            'owner_name' => 'Harbor Owner',
            'owner_email' => 'owner@harborbistro.test',
            'owner_phone' => '+447700900222',
            'owner_role_title' => 'Owner',
            'owner_password' => 'SecurePass1!',
            'owner_password_confirmation' => 'SecurePass1!',
            'plan_id' => $plan->id,
            'order_types' => ['pickup'],
            'estimated_daily_orders' => 30,
            'staff_count' => 3,
            'branch_count' => 1,
            'terms_accepted' => true,
        ])->assertCreated();

        // Welcome WhatsApp is sent at signup (asserted via mock above).

        $token = null;
        Mail::assertSent(EmailVerificationMail::class, function (EmailVerificationMail $mail) use (&$token) {
            parse_str((string) parse_url($mail->verifyUrl, PHP_URL_QUERY), $query);
            $token = $query['token'] ?? null;

            return is_string($token) && $token !== '';
        });

        $this->postJson('/api/v1/auth/verify-email', [
            'token' => $token,
            'email' => 'owner@harborbistro.test',
        ])->assertOk();

        $response = $this->postJson('/api/v1/auth/login', [
            'email' => 'owner@harborbistro.test',
            'password' => 'SecurePass1!',
            'tenant_slug' => 'harbor-bistro',
        ]);

        $response->assertOk();
        $response->assertJsonPath('user.role', 'owner');
        $response->assertJsonPath('user.tenant_slug', 'harbor-bistro');
    }

    public function test_signup_owner_cannot_login_before_email_verification(): void
    {
        Mail::fake();

        $plan = Plan::where('slug', 'starter')->firstOrFail();

        $this->postJson('/api/v1/signup', [
            'restaurant_name' => 'Harbor Bistro',
            'legal_business_name' => 'Harbor Bistro Ltd',
            'business_type' => 'restaurant',
            'slug' => 'harbor-bistro',
            'country' => 'United Kingdom',
            'city' => 'Bristol',
            'street_address' => '3 Harbor Road',
            'postal_code' => 'BS1 4ST',
            'timezone' => 'Europe/London',
            'currency' => 'GBP',
            'owner_name' => 'Harbor Owner',
            'owner_email' => 'owner@harborbistro.test',
            'owner_phone' => '+447700900222',
            'owner_role_title' => 'Owner',
            'owner_password' => 'SecurePass1!',
            'owner_password_confirmation' => 'SecurePass1!',
            'plan_id' => $plan->id,
            'order_types' => ['pickup'],
            'estimated_daily_orders' => 30,
            'staff_count' => 3,
            'branch_count' => 1,
            'terms_accepted' => true,
        ])->assertCreated();

        $response = $this->postJson('/api/v1/auth/login', [
            'email' => 'owner@harborbistro.test',
            'password' => 'SecurePass1!',
            'tenant_slug' => 'harbor-bistro',
        ]);

        $response->assertStatus(422);
    }

    public function test_signup_owner_can_login_without_tenant_slug_after_verification(): void
    {
        Mail::fake();

        $plan = Plan::where('slug', 'starter')->firstOrFail();

        $this->postJson('/api/v1/signup', [
            'restaurant_name' => 'Cedar Cafe',
            'legal_business_name' => 'Cedar Cafe Ltd',
            'business_type' => 'cafe',
            'slug' => 'cedar-cafe',
            'country' => 'United Kingdom',
            'city' => 'Leeds',
            'street_address' => '8 Cedar Street',
            'postal_code' => 'LS1 1AA',
            'timezone' => 'Europe/London',
            'currency' => 'GBP',
            'owner_name' => 'Cedar Owner',
            'owner_email' => 'owner@cedarcafe.test',
            'owner_phone' => '+447700900333',
            'owner_role_title' => 'Owner',
            'owner_password' => 'SecurePass1!',
            'owner_password_confirmation' => 'SecurePass1!',
            'plan_id' => $plan->id,
            'order_types' => ['pickup'],
            'estimated_daily_orders' => 25,
            'staff_count' => 2,
            'branch_count' => 1,
            'terms_accepted' => true,
        ])->assertCreated();

        $token = null;
        Mail::assertSent(EmailVerificationMail::class, function (EmailVerificationMail $mail) use (&$token) {
            parse_str((string) parse_url($mail->verifyUrl, PHP_URL_QUERY), $query);
            $token = $query['token'] ?? null;

            return is_string($token) && $token !== '';
        });

        $this->postJson('/api/v1/auth/verify-email', [
            'token' => $token,
            'email' => 'owner@cedarcafe.test',
        ])->assertOk();

        $response = $this->postJson('/api/v1/auth/login', [
            'email' => 'owner@cedarcafe.test',
            'password' => 'SecurePass1!',
        ]);

        $response->assertOk();
        $response->assertJsonPath('user.role', 'owner');
        $response->assertJsonPath('user.tenant_slug', 'cedar-cafe');
    }

    public function test_signup_rejects_duplicate_owner_email(): void
    {
        Mail::fake();

        $existing = User::where('email', 'owner@khayaos.com')->firstOrFail();
        $plan = Plan::where('slug', 'starter')->firstOrFail();

        $response = $this->postJson('/api/v1/signup', [
            'restaurant_name' => 'Duplicate Test',
            'legal_business_name' => 'Duplicate Test Ltd',
            'business_type' => 'cafe',
            'slug' => 'duplicate-test',
            'country' => 'United Kingdom',
            'city' => 'Manchester',
            'street_address' => '1 High Street',
            'postal_code' => 'M1 1AA',
            'timezone' => 'Europe/London',
            'currency' => 'GBP',
            'owner_name' => 'Existing Owner',
            'owner_email' => $existing->email,
            'owner_phone' => '+447700900999',
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

        $response->assertStatus(422);
        Mail::assertNothingSent();
    }

    public function test_signup_allows_optional_postal_code_outside_uk_europe_canada(): void
    {
        Mail::fake();

        $plan = Plan::where('slug', 'starter')->firstOrFail();

        $response = $this->postJson('/api/v1/signup', [
            'restaurant_name' => 'Lagos Kitchen',
            'legal_business_name' => 'Lagos Kitchen Ltd',
            'business_type' => 'restaurant',
            'slug' => 'lagos-kitchen',
            'country' => 'Nigeria',
            'state' => 'Lagos',
            'city' => 'Lagos',
            'street_address' => '12 Admiralty Way',
            'timezone' => 'Africa/Lagos',
            'currency' => 'NGN',
            'owner_name' => 'Ngozi Owner',
            'owner_email' => 'ngozi@lagoskitchen.test',
            'owner_phone' => '+2348012345678',
            'owner_role_title' => 'Owner',
            'owner_password' => 'SecurePass1!',
            'owner_password_confirmation' => 'SecurePass1!',
            'plan_id' => $plan->id,
            'order_types' => ['pickup'],
            'estimated_daily_orders' => 40,
            'staff_count' => 4,
            'branch_count' => 1,
            'terms_accepted' => true,
        ]);

        $response->assertCreated();
        Mail::assertSent(EmailVerificationMail::class);
    }

    public function test_signup_requires_postal_code_for_united_kingdom(): void
    {
        Mail::fake();

        $plan = Plan::where('slug', 'starter')->firstOrFail();

        $response = $this->postJson('/api/v1/signup', [
            'restaurant_name' => 'No Postcode Kitchen',
            'legal_business_name' => 'No Postcode Kitchen Ltd',
            'business_type' => 'restaurant',
            'slug' => 'no-postcode-kitchen',
            'country' => 'United Kingdom',
            'city' => 'London',
            'street_address' => '1 Test Street',
            'timezone' => 'Europe/London',
            'currency' => 'GBP',
            'owner_name' => 'Test Owner',
            'owner_email' => 'nopostcode@testkitchen.test',
            'owner_phone' => '+447700900111',
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

        $response->assertStatus(422);
        $response->assertJsonPath('code', 'VALIDATION_ERROR');
        $this->assertArrayHasKey('postal_code', $response->json('details'));
        Mail::assertNothingSent();
    }

    public function test_signup_stores_uploaded_logo_on_tenant_and_branding(): void
    {
        Mail::fake();
        Storage::fake('public');

        $plan = Plan::where('slug', 'growth')->firstOrFail();

        $response = $this->post('/api/v1/signup', [
            'restaurant_name' => 'Logo Kitchen',
            'legal_business_name' => 'Logo Kitchen Ltd',
            'business_type' => 'restaurant',
            'slug' => 'logo-kitchen',
            'country' => 'United Kingdom',
            'city' => 'Manchester',
            'street_address' => '9 Logo Lane',
            'postal_code' => 'M1 1AE',
            'timezone' => 'Europe/London',
            'currency' => 'GBP',
            'owner_name' => 'Logo Owner',
            'owner_email' => 'owner@logokitchen.test',
            'owner_phone' => '+447700900333',
            'owner_role_title' => 'Owner',
            'owner_password' => 'SecurePass1!',
            'owner_password_confirmation' => 'SecurePass1!',
            'plan_id' => $plan->id,
            'order_types' => ['pickup'],
            'estimated_daily_orders' => 25,
            'staff_count' => 3,
            'branch_count' => 1,
            'terms_accepted' => true,
            'logo' => UploadedFile::fake()->image('kitchen-logo.png'),
        ]);

        $response->assertCreated();
        $response->assertJsonPath('tenant.slug', 'logo-kitchen');
        $this->assertNotEmpty($response->json('tenant.logo_url'));

        $tenant = Tenant::where('slug', 'logo-kitchen')->firstOrFail();
        $this->assertNotNull($tenant->logo_url);

        $this->assertDatabaseHas('tenant_brandings', [
            'tenant_id' => $tenant->id,
            'logo_url' => $tenant->logo_url,
            'restaurant_name' => 'Logo Kitchen',
        ]);
    }

    public function test_signup_succeeds_with_empty_optional_tagline_and_without_logo(): void
    {
        Mail::fake();

        $plan = Plan::where('slug', 'growth')->firstOrFail();

        $response = $this->postJson('/api/v1/signup', [
            'restaurant_name' => 'Plain Kitchen',
            'legal_business_name' => 'Plain Kitchen Ltd',
            'business_type' => 'restaurant',
            'slug' => 'plain-kitchen',
            'country' => 'United Kingdom',
            'city' => 'London',
            'street_address' => '1 Plain Street',
            'postal_code' => 'E1 1AA',
            'timezone' => 'Europe/London',
            'currency' => 'GBP',
            'owner_name' => 'Plain Owner',
            'owner_email' => 'owner@plainkitchen.test',
            'owner_phone' => '+447700900444',
            'owner_role_title' => 'Owner',
            'owner_password' => 'SecurePass1!',
            'owner_password_confirmation' => 'SecurePass1!',
            'plan_id' => $plan->id,
            'order_types' => ['pickup'],
            'estimated_daily_orders' => 20,
            'staff_count' => 2,
            'branch_count' => 1,
            'tagline' => '',
            'primary_color' => '#1A1A2E',
            'secondary_color' => '#E94560',
            'terms_accepted' => true,
            'marketing_opt_in' => true,
        ]);

        $response->assertCreated();
        $response->assertJsonPath('tenant.slug', 'plain-kitchen');
        $response->assertJsonPath('message', 'Check your email to confirm your account before signing in.');

        $tenant = Tenant::where('slug', 'plain-kitchen')->firstOrFail();
        $this->assertNull($tenant->logo_url);
        $this->assertArrayHasKey('tagline', $tenant->signup_metadata);
        $this->assertNull($tenant->signup_metadata['tagline']);

        $this->assertDatabaseHas('tenant_brandings', [
            'tenant_id' => $tenant->id,
            'restaurant_name' => 'Plain Kitchen',
            'primary_color' => '#1A1A2E',
            'secondary_color' => '#E94560',
        ]);

        Mail::assertSent(EmailVerificationMail::class);
    }

    public function test_signup_queues_welcome_whatsapp_job_with_phone_only_payload(): void
    {
        Mail::fake();
        Queue::fake();

        $plan = Plan::where('slug', 'starter')->firstOrFail();

        $this->postJson('/api/v1/signup', [
            'restaurant_name' => 'Queue Kitchen',
            'legal_business_name' => 'Queue Kitchen Ltd',
            'business_type' => 'restaurant',
            'slug' => 'queue-kitchen',
            'country' => 'United Arab Emirates',
            'city' => 'Dubai',
            'street_address' => '1 Marina Walk',
            'timezone' => 'Asia/Dubai',
            'currency' => 'AED',
            'owner_name' => 'Queue Owner',
            'owner_email' => 'owner@queuekitchen.test',
            'owner_phone' => '+971553551606',
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

        Queue::assertPushed(SendSignupWelcomeWhatsAppJob::class, function (SendSignupWelcomeWhatsAppJob $job) {
            return $job->tenantSlug === 'queue-kitchen'
                && ($job->signupData['owner_phone'] ?? null) === '+971553551606'
                && ! array_key_exists('owner_password', $job->signupData)
                && ! array_key_exists('logo', $job->signupData);
        });
    }
}
