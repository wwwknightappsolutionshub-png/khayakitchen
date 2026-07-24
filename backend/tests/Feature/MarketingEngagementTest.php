<?php

namespace Tests\Feature;

use App\Modules\Platform\Domain\Models\MarketingVisitorStat;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class MarketingEngagementTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed();
    }

    public function test_visitor_hit_starts_at_200_and_bumps_new_ip(): void
    {
        $first = $this->postJson('/api/v1/marketing/visitor-hit');
        $first->assertOk();
        $first->assertJsonPath('display_count', 210);
        $first->assertJsonPath('incremented', true);

        $second = $this->postJson('/api/v1/marketing/visitor-hit');
        $second->assertOk();
        $second->assertJsonPath('display_count', 210);
        $second->assertJsonPath('incremented', false);

        $this->assertDatabaseCount('marketing_visitor_ips', 1);
        $this->assertSame(210, (int) MarketingVisitorStat::query()->value('display_count'));
    }

    public function test_marketing_chat_returns_reply_and_whatsapp_fallback(): void
    {
        $response = $this->postJson('/api/v1/marketing/chat', [
            'message' => 'How is KhayaOS different from Uber Eats?',
        ]);

        $response->assertOk();
        $this->assertNotEmpty($response->json('reply'));
        $this->assertStringContainsString('447756183484', (string) $response->json('whatsapp_url'));
    }
}
