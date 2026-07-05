<?php

namespace Tests\Feature;

use App\Modules\Auth\Domain\Models\Tenant;
use App\Modules\Auth\Domain\Models\User;
use App\Modules\Platform\Mail\WelcomeOwnerMail;
use App\Modules\Pricing\Domain\Models\Plan;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

class PublicSignupTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed();
    }

    public function test_public_signup_provisions_tenant_plan_and_welcome_email(): void
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
        $response->assertJsonPath('message', 'Congratulations and welcome to KhayaOS');
        $response->assertJsonPath('tenant.slug', 'sunrise-kitchen');

        $tenant = Tenant::where('slug', 'sunrise-kitchen')->firstOrFail();
        $this->assertNotNull($tenant->signup_metadata);
        $this->assertSame('London', $tenant->signup_metadata['city']);

        $this->assertDatabaseHas('users', [
            'tenant_id' => $tenant->id,
            'email' => 'ada@sunrisekitchen.test',
            'role' => 'owner',
        ]);

        $this->assertDatabaseHas('tenant_subscriptions', [
            'tenant_id' => $tenant->id,
            'plan_id' => $plan->id,
        ]);

        Mail::assertSent(WelcomeOwnerMail::class, function (WelcomeOwnerMail $mail) {
            return $mail->ownerEmail === 'ada@sunrisekitchen.test'
                && $mail->plainPassword === 'SecurePass1!'
                && $mail->tenantSlug === 'sunrise-kitchen';
        });
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
}
