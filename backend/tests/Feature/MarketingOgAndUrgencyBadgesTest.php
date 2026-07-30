<?php

namespace Tests\Feature;

use App\Modules\Auth\Domain\Models\Tenant;
use App\Modules\Auth\Domain\Models\User;
use App\Modules\Menu\Domain\Models\Meal;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class MarketingOgAndUrgencyBadgesTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed();
    }

    public function test_public_config_exposes_og_image_url(): void
    {
        $settings = app(\App\Modules\Platform\Application\Services\PlatformSettingsService::class)->get();
        $settings->update(['og_image_url' => 'https://cdn.example.com/og-custom.jpg']);

        $response = $this->getJson('/api/v1/platform/public-config');
        $response->assertOk();
        $response->assertJsonPath('og_image_url', 'https://cdn.example.com/og-custom.jpg');
    }

    public function test_notification_badges_include_ready_awaiting_completion(): void
    {
        $owner = User::withoutGlobalScopes()->where('email', 'owner@khayaos.com')->firstOrFail();
        $tenant = Tenant::withoutGlobalScopes()->where('slug', 'pilot')->firstOrFail();
        $token = $owner->createToken('test')->plainTextToken;
        $meal = Meal::firstOrFail();

        $create = $this->postJson('/api/v1/customer/orders', [
            'name' => 'Ready Alarm Guest',
            'phone' => '+447700901234',
            'order_type' => 'pickup',
            'payment_method' => 'card',
            'items' => [['meal_id' => $meal->id, 'quantity' => 1, 'options' => []]],
        ], ['X-Tenant-Slug' => $tenant->slug]);

        $create->assertCreated();
        $orderId = $create->json('order_id');

        foreach (['accepted', 'preparing', 'ready'] as $status) {
            $this->patchJson("/api/v1/orders/{$orderId}/status", ['status' => $status], [
                'Authorization' => "Bearer {$token}",
                'X-Tenant-Slug' => $tenant->slug,
            ])->assertOk();
        }

        $badges = $this->getJson('/api/v1/engagement/notification-badges', [
            'Authorization' => "Bearer {$token}",
            'X-Tenant-Slug' => $tenant->slug,
        ]);

        $badges->assertOk();
        $this->assertGreaterThanOrEqual(1, (int) $badges->json('ready_awaiting_completion'));
    }
}
