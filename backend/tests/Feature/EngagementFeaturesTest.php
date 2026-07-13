<?php

namespace Tests\Feature;

use App\Modules\Auth\Domain\Models\Tenant;
use App\Modules\Auth\Domain\Models\User;
use App\Modules\CRM\Domain\Models\Customer;
use App\Modules\Engagement\Domain\Models\KitchenReview;
use App\Modules\Menu\Domain\Models\Meal;
use App\Modules\Pricing\Domain\Models\Feature;
use App\Modules\Pricing\Domain\Models\Plan;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

class EngagementFeaturesTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed();
    }

    private function enableFeature(string $tenantId, string $featureKey): void
    {
        $feature = Feature::where('key', $featureKey)->firstOrFail();
        $plan = Plan::where('slug', 'growth')->firstOrFail();
        if ($plan->features()->where('features.id', $feature->id)->exists()) {
            $plan->features()->updateExistingPivot($feature->id, ['enabled' => true]);
        } else {
            $plan->features()->attach($feature->id, ['enabled' => true]);
        }
        app(\App\Shared\Entitlements\FeatureAccessService::class)->clearCache($tenantId);
    }

    public function test_platform_email_to_tenant_requires_entitlement(): void
    {
        Mail::fake();
        $admin = User::where('email', 'admin@khayaos.com')->firstOrFail();
        $tenant = Tenant::where('slug', 'pilot')->firstOrFail();
        $token = $admin->createToken('test')->plainTextToken;

        $blocked = $this->postJson('/api/v1/platform/messages', [
            'tenant_id' => $tenant->id,
            'channel' => 'email',
            'title' => 'Hello',
            'body' => 'Platform notice',
        ], ['Authorization' => "Bearer {$token}"]);

        $blocked->assertStatus(403);

        $this->enableFeature($tenant->id, 'platform_tenant_email');

        $ok = $this->postJson('/api/v1/platform/messages', [
            'tenant_id' => $tenant->id,
            'channel' => 'email',
            'title' => 'Hello',
            'body' => 'Platform notice',
        ], ['Authorization' => "Bearer {$token}"]);

        $ok->assertCreated();
        $ok->assertJsonPath('message.status', 'sent');
        Mail::assertSent(\App\Modules\Engagement\Mail\PlatformToTenantMail::class);
    }

    public function test_platform_tenant_chat_round_trip(): void
    {
        $admin = User::where('email', 'admin@khayaos.com')->firstOrFail();
        $owner = User::where('email', 'owner@khayaos.com')->firstOrFail();
        $tenant = Tenant::where('slug', 'pilot')->firstOrFail();
        $this->enableFeature($tenant->id, 'platform_tenant_chat');

        $this->actingAs($admin, 'sanctum');
        $open = $this->postJson('/api/v1/platform/chat/threads', [
            'tenant_id' => $tenant->id,
            'subject' => 'Support',
        ]);
        $open->assertCreated();
        $threadId = $open->json('thread.id');

        $this->postJson("/api/v1/platform/chat/threads/{$threadId}/messages", [
            'body' => 'Hello tenant',
        ])->assertCreated();

        $this->actingAs($owner, 'sanctum');
        $tenantView = $this->withHeaders(['X-Tenant-Slug' => 'pilot'])
            ->getJson("/api/v1/engagement/chat/threads/{$threadId}");
        $tenantView->assertOk();
        $this->assertNotEmpty($tenantView->json('thread.messages'));

        $this->withHeaders(['X-Tenant-Slug' => 'pilot'])
            ->postJson("/api/v1/engagement/chat/threads/{$threadId}/messages", [
                'body' => 'Thanks platform',
            ])->assertCreated();
    }

    public function test_meal_like_and_refer_and_review_moderation_ticker(): void
    {
        $owner = User::where('email', 'owner@khayaos.com')->firstOrFail();
        $tenant = Tenant::where('slug', 'pilot')->firstOrFail();
        $meal = Meal::where('tenant_id', $tenant->id)->firstOrFail();
        $ownerToken = $owner->createToken('test')->plainTextToken;

        $this->enableFeature($tenant->id, 'menu_likes_refer');
        $this->enableFeature($tenant->id, 'kitchen_reviews');

        $like = $this->postJson("/api/v1/customer/meals/{$meal->id}/like", [
            'guest_key' => 'guest-abc-123',
        ], ['X-Tenant-Slug' => 'pilot']);
        $like->assertOk();
        $like->assertJsonPath('liked', true);

        $refer = $this->getJson("/api/v1/customer/meals/{$meal->id}/refer", [
            'X-Tenant-Slug' => 'pilot',
        ]);
        $refer->assertOk();
        $this->assertStringContainsString('I will suggest you try this menu from', $refer->json('refer.message'));

        $review = $this->postJson('/api/v1/customer/reviews', [
            'name' => 'Ada',
            'phone' => '+2348000009999',
            'body' => 'Great kitchen. Food was hot. Will return soon.',
        ], ['X-Tenant-Slug' => 'pilot']);
        $review->assertCreated();
        $reviewId = $review->json('review.id');

        $this->patchJson("/api/v1/engagement/reviews/{$reviewId}", [
            'status' => 'approved',
        ], [
            'Authorization' => "Bearer {$ownerToken}",
            'X-Tenant-Slug' => 'pilot',
        ])->assertOk();

        $this->assertDatabaseHas('kitchen_reviews', [
            'id' => $reviewId,
            'status' => 'approved',
        ]);

        $storefront = $this->getJson('/api/v1/storefront', ['X-Tenant-Slug' => 'pilot']);
        $storefront->assertOk();
        $ticker = $storefront->json('review_ticker');
        $this->assertNotEmpty($ticker);
        $this->assertSame('Ada', $ticker[0]['customer_name']);
    }

    public function test_tenant_customer_chat_requires_feature(): void
    {
        $owner = User::where('email', 'owner@khayaos.com')->firstOrFail();
        $tenant = Tenant::where('slug', 'pilot')->firstOrFail();
        $customer = Customer::create([
            'tenant_id' => $tenant->id,
            'name' => 'Sam',
            'phone' => '+2348012340000',
        ]);
        $token = $owner->createToken('test')->plainTextToken;

        $feature = Feature::where('key', 'tenant_customer_chat')->firstOrFail();
        $plan = Plan::where('slug', 'growth')->firstOrFail();
        $plan->features()->updateExistingPivot($feature->id, ['enabled' => false]);
        app(\App\Shared\Entitlements\FeatureAccessService::class)->clearCache($tenant->id);

        $blocked = $this->postJson('/api/v1/engagement/customer-chat/threads', [
            'customer_id' => $customer->id,
        ], [
            'Authorization' => "Bearer {$token}",
            'X-Tenant-Slug' => 'pilot',
        ]);
        $blocked->assertStatus(403);

        $this->enableFeature($tenant->id, 'tenant_customer_chat');

        $ok = $this->postJson('/api/v1/engagement/customer-chat/threads', [
            'customer_id' => $customer->id,
        ], [
            'Authorization' => "Bearer {$token}",
            'X-Tenant-Slug' => 'pilot',
        ]);
        $ok->assertCreated();
    }

    public function test_guest_can_open_and_message_customer_chat(): void
    {
        $tenant = Tenant::where('slug', 'pilot')->firstOrFail();
        $this->enableFeature($tenant->id, 'tenant_customer_chat');

        $open = $this->postJson('/api/v1/customer/chat/threads', [
            'guest_key' => 'guest-menu-chat-key-1',
            'name' => 'Walk-in Guest',
            'subject' => 'Help',
        ], [
            'X-Tenant-Slug' => 'pilot',
        ]);
        $open->assertCreated();
        $threadId = $open->json('thread.id');
        $this->assertNotEmpty($threadId);

        $post = $this->postJson("/api/v1/customer/chat/threads/{$threadId}/messages", [
            'guest_key' => 'guest-menu-chat-key-1',
            'body' => 'Hello from guest',
        ], [
            'X-Tenant-Slug' => 'pilot',
        ]);
        $post->assertCreated();
        $post->assertJsonPath('message.body', 'Hello from guest');

        $show = $this->getJson("/api/v1/customer/chat/threads/{$threadId}?guest_key=guest-menu-chat-key-1", [
            'X-Tenant-Slug' => 'pilot',
        ]);
        $show->assertOk();
        $this->assertNotEmpty($show->json('thread.messages'));
    }

    public function test_super_admin_can_create_platform_support_user(): void
    {
        $admin = User::where('email', 'admin@khayaos.com')->firstOrFail();
        $token = $admin->createToken('test')->plainTextToken;

        $response = $this->postJson('/api/v1/platform/staff', [
            'name' => 'Support Agent',
            'email' => 'support.agent@khayaos.com',
            'password' => 'password123',
            'role' => 'platform_support',
        ], ['Authorization' => "Bearer {$token}"]);

        $response->assertCreated();
        $this->assertDatabaseHas('users', [
            'email' => 'support.agent@khayaos.com',
            'role' => 'platform_support',
        ]);
    }

    public function test_tenant_staff_can_register_device_token_for_push(): void
    {
        $owner = User::where('email', 'owner@khayaos.com')->firstOrFail();
        $token = $owner->createToken('test')->plainTextToken;
        $deviceToken = json_encode([
            'endpoint' => 'https://push.example/staff-token-1',
            'keys' => ['p256dh' => 'x', 'auth' => 'y'],
        ], JSON_THROW_ON_ERROR);

        $response = $this->postJson('/api/v1/engagement/staff-device-token', [
            'device_token' => $deviceToken,
            'platform' => 'web',
        ], [
            'Authorization' => "Bearer {$token}",
            'X-Tenant-Slug' => 'pilot',
        ]);

        $response->assertCreated();
        $this->assertDatabaseHas('device_tokens', [
            'tenant_id' => $owner->tenant_id,
            'user_id' => $owner->id,
            'platform' => 'web',
        ]);
    }
}
