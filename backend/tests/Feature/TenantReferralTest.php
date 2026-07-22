<?php

namespace Tests\Feature;

use App\Modules\Auth\Domain\Models\Tenant;
use App\Modules\Auth\Domain\Models\User;
use App\Modules\Pricing\Domain\Models\Plan;
use App\Modules\Pricing\Domain\Models\TenantReferralCode;
use App\Modules\Pricing\Domain\Models\TenantReferralLead;
use App\Modules\Pricing\Domain\Models\TenantSubscription;
use App\Modules\Pricing\Mail\TenantReferralInviteMail;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

class TenantReferralTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed();
    }

    private function ownerContext(): array
    {
        $owner = User::withoutGlobalScopes()->where('email', 'owner@khayaos.com')->firstOrFail();

        return [
            'token' => $owner->createToken('test')->plainTextToken,
            'tenant' => Tenant::withoutGlobalScopes()->where('slug', 'pilot')->firstOrFail(),
            'owner' => $owner,
        ];
    }

    private function adminToken(): string
    {
        return User::withoutGlobalScopes()
            ->where('email', 'admin@khayaos.com')
            ->firstOrFail()
            ->createToken('test')
            ->plainTextToken;
    }

    /**
     * @return array<string, mixed>
     */
    private function signupPayload(string $slug, string $email, string $phone, ?string $referralCode = null): array
    {
        $plan = Plan::where('slug', 'growth')->firstOrFail();

        $payload = [
            'restaurant_name' => 'Referred Kitchen '.$slug,
            'legal_business_name' => 'Referred Kitchen Ltd',
            'business_type' => 'restaurant',
            'slug' => $slug,
            'country' => 'United Kingdom',
            'city' => 'Manchester',
            'street_address' => '1 High Street',
            'postal_code' => 'M1 1AA',
            'timezone' => 'Europe/London',
            'currency' => 'GBP',
            'owner_name' => 'New Owner',
            'owner_email' => $email,
            'owner_phone' => $phone,
            'owner_role_title' => 'Owner',
            'owner_password' => 'SecurePass1!',
            'owner_password_confirmation' => 'SecurePass1!',
            'plan_id' => $plan->id,
            'order_types' => ['pickup'],
            'estimated_daily_orders' => 40,
            'staff_count' => 4,
            'branch_count' => 1,
            'terms_accepted' => true,
        ];

        if ($referralCode) {
            $payload['referral_code'] = $referralCode;
        }

        return $payload;
    }

    public function test_invite_creates_lead_with_email_phone_and_invited_at(): void
    {
        Mail::fake();

        ['token' => $token, 'tenant' => $tenant] = $this->ownerContext();

        $response = $this->postJson('/api/v1/referrals/invite', [
            'email' => 'prospect@example.com',
            'phone' => '+447700900999',
            'name' => 'Prospect Chef',
            'channel' => 'email',
        ], [
            'Authorization' => "Bearer {$token}",
            'X-Tenant-Slug' => $tenant->slug,
        ]);

        $response->assertCreated();
        $response->assertJsonPath('lead.prospect_email', 'prospect@example.com');
        $response->assertJsonPath('lead.prospect_phone', '+447700900999');
        $response->assertJsonPath('lead.status', 'invited');
        $this->assertNotEmpty($response->json('lead.invited_at'));

        $this->assertDatabaseHas('tenant_referral_leads', [
            'referrer_tenant_id' => $tenant->id,
            'prospect_email' => 'prospect@example.com',
            'prospect_phone' => '+447700900999',
            'channel' => 'email',
            'status' => 'invited',
        ]);

        Mail::assertSent(TenantReferralInviteMail::class);
    }

    public function test_platform_leads_api_returns_email_phone_invited_at(): void
    {
        $tenant = Tenant::withoutGlobalScopes()->where('slug', 'pilot')->firstOrFail();
        $code = TenantReferralCode::create([
            'tenant_id' => $tenant->id,
            'code' => 'LEADTEST1',
            'owner_type' => 'tenant',
            'reward_days' => 30,
            'referee_trial_days' => 30,
            'active' => true,
        ]);

        TenantReferralLead::create([
            'referral_code_id' => $code->id,
            'referrer_tenant_id' => $tenant->id,
            'prospect_email' => 'lead-visible@example.com',
            'prospect_phone' => '+447700900111',
            'channel' => 'email',
            'status' => TenantReferralLead::STATUS_INVITED,
            'invited_at' => now(),
        ]);

        $admin = User::withoutGlobalScopes()->where('email', 'admin@khayaos.com')->firstOrFail();
        $leads = $this->actingAs($admin, 'sanctum')->getJson('/api/v1/platform/leads');

        $leads->assertOk();
        $row = collect($leads->json('leads'))->firstWhere('prospect_email', 'lead-visible@example.com');
        $this->assertNotNull($row);
        $this->assertSame('+447700900111', $row['prospect_phone']);
        $this->assertNotEmpty($row['invited_at']);
        $this->assertSame($tenant->slug, $row['referrer_tenant']['slug'] ?? null);
    }

    public function test_signup_with_referral_code_applies_trial_and_referrer_reward_once(): void
    {
        Mail::fake();

        ['token' => $token, 'tenant' => $referrer] = $this->ownerContext();

        $summary = $this->getJson('/api/v1/referrals', [
            'Authorization' => "Bearer {$token}",
            'X-Tenant-Slug' => $referrer->slug,
        ]);
        $summary->assertOk();
        $code = $summary->json('code');
        $this->assertNotEmpty($code);

        $referrerBefore = Tenant::withoutGlobalScopes()->findOrFail($referrer->id);
        $referrerTrialBefore = $referrerBefore->trial_ends_at;

        $signup = $this->postJson('/api/v1/signup', $this->signupPayload(
            'referred-once',
            'referred.once@example.com',
            '+447700900222',
            $code,
        ));
        $signup->assertCreated();

        $newTenant = Tenant::where('slug', 'referred-once')->firstOrFail();
        $this->assertNotNull($newTenant->trial_ends_at);
        $this->assertTrue($newTenant->trial_ends_at->isFuture());

        $subscription = TenantSubscription::where('tenant_id', $newTenant->id)->firstOrFail();
        $this->assertSame('trial', $subscription->status);

        $referrerAfter = Tenant::withoutGlobalScopes()->findOrFail($referrer->id);
        $this->assertNotNull($referrerAfter->trial_ends_at);
        if ($referrerTrialBefore) {
            $this->assertTrue($referrerAfter->trial_ends_at->gt($referrerTrialBefore));
        } else {
            $this->assertTrue($referrerAfter->trial_ends_at->isFuture());
        }

        $this->assertDatabaseHas('tenant_referral_leads', [
            'referrer_tenant_id' => $referrer->id,
            'referred_tenant_id' => $newTenant->id,
            'status' => TenantReferralLead::STATUS_REWARDED,
        ]);

        $rewardedCount = TenantReferralLead::query()
            ->where('referred_tenant_id', $newTenant->id)
            ->where('status', TenantReferralLead::STATUS_REWARDED)
            ->count();
        $this->assertSame(1, $rewardedCount);

        // Completing attribution again must not duplicate rewards.
        app(\App\Modules\Pricing\Application\Services\TenantReferralService::class)
            ->completeSignupAttribution($newTenant->id, [
                'referral_code' => $code,
                'owner_email' => 'referred.once@example.com',
                'owner_phone' => '+447700900222',
            ]);

        $this->assertSame(
            1,
            TenantReferralLead::query()
                ->where('referred_tenant_id', $newTenant->id)
                ->where('status', TenantReferralLead::STATUS_REWARDED)
                ->count(),
        );
    }

    public function test_self_referral_invite_is_rejected(): void
    {
        Mail::fake();

        ['token' => $token, 'tenant' => $tenant, 'owner' => $owner] = $this->ownerContext();

        $response = $this->postJson('/api/v1/referrals/invite', [
            'email' => $owner->email,
            'phone' => '+447700900333',
            'channel' => 'email',
        ], [
            'Authorization' => "Bearer {$token}",
            'X-Tenant-Slug' => $tenant->slug,
        ]);

        $response->assertStatus(422);
        $this->assertDatabaseMissing('tenant_referral_leads', [
            'referrer_tenant_id' => $tenant->id,
            'prospect_email' => strtolower($owner->email),
        ]);
    }

    public function test_self_referral_signup_does_not_reward(): void
    {
        Mail::fake();

        ['token' => $token, 'tenant' => $referrer, 'owner' => $owner] = $this->ownerContext();

        $code = $this->getJson('/api/v1/referrals', [
            'Authorization' => "Bearer {$token}",
            'X-Tenant-Slug' => $referrer->slug,
        ])->json('code');

        // Different slug/restaurant but same owner email as referrer.
        $signup = $this->postJson('/api/v1/signup', $this->signupPayload(
            'self-ref-blocked',
            $owner->email,
            '+447700900444',
            $code,
        ));

        // Duplicate owner email is rejected at signup — use a phone match via metadata instead.
        $signup->assertStatus(422);

        TenantReferralCode::query()->where('code', $code)->firstOrFail();

        // Create a fresh email but matching referrer phone from signup_metadata.
        $referrer->signup_metadata = array_merge($referrer->signup_metadata ?? [], [
            'owner_phone' => '+447711122233',
        ]);
        $referrer->save();

        $signup2 = $this->postJson('/api/v1/signup', $this->signupPayload(
            'self-ref-phone',
            'self.ref.phone@example.com',
            '+447711122233',
            $code,
        ));
        $signup2->assertCreated();

        $newTenant = Tenant::where('slug', 'self-ref-phone')->firstOrFail();
        $this->assertDatabaseMissing('tenant_referral_leads', [
            'referred_tenant_id' => $newTenant->id,
            'status' => TenantReferralLead::STATUS_REWARDED,
        ]);

        $sub = TenantSubscription::where('tenant_id', $newTenant->id)->firstOrFail();
        $this->assertSame('active', $sub->status);
    }
}
