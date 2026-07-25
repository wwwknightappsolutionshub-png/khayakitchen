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
        $first->assertJsonPath('incremented', true);
        $count = (int) $first->json('display_count');
        $step = (int) $first->json('step');
        $this->assertGreaterThanOrEqual(1, $step);
        $this->assertLessThanOrEqual(10, $step);
        $this->assertSame(200 + $step, $count);

        $second = $this->postJson('/api/v1/marketing/visitor-hit');
        $second->assertOk();
        $second->assertJsonPath('display_count', $count);
        $second->assertJsonPath('incremented', false);

        $this->assertDatabaseCount('marketing_visitor_ips', 1);
        $this->assertSame($count, (int) MarketingVisitorStat::query()->value('display_count'));
    }

    public function test_marketing_chat_returns_reply_and_whatsapp_fallback(): void
    {
        $response = $this->postJson('/api/v1/marketing/chat', [
            'message' => 'How is KhayaOS different from Uber Eats?',
        ]);

        $response->assertOk();
        $this->assertNotEmpty($response->json('reply'));
        $this->assertStringContainsString('447756183484', (string) $response->json('whatsapp_url'));
        $response->assertJsonPath('confident', true);
    }

    public function test_marketing_chat_greets_and_steers_off_topic_to_specialty(): void
    {
        $hello = $this->postJson('/api/v1/marketing/chat', [
            'message' => 'Hi',
        ]);
        $hello->assertOk();
        $hello->assertJsonPath('confident', true);
        $hello->assertJsonPath('needs_email', false);
        $this->assertStringContainsString('KhayaOS', (string) $hello->json('reply'));

        $offTopic = $this->postJson('/api/v1/marketing/chat', [
            'message' => 'What is the capital of Atlantis?',
        ]);
        $offTopic->assertOk();
        $offTopic->assertJsonPath('needs_email', false);
        $offTopic->assertJsonPath('confident', true);
        $this->assertStringContainsString('kitchen', strtolower((string) $offTopic->json('reply')));
    }

    public function test_marketing_chat_email_handoffs_to_whatsapp_when_requested(): void
    {
        $human = $this->postJson('/api/v1/marketing/chat', [
            'message' => 'I want to speak to a human on WhatsApp',
        ]);
        $human->assertOk();
        $human->assertJsonPath('needs_email', true);

        $handoff = $this->postJson('/api/v1/marketing/chat', [
            'message' => 'owner@kitchen.test',
            'email' => 'owner@kitchen.test',
            'history' => [
                ['role' => 'user', 'content' => 'I want to speak to a human on WhatsApp'],
                ['role' => 'assistant', 'content' => 'Need email'],
            ],
        ]);
        $handoff->assertOk();
        $handoff->assertJsonPath('handoff', true);
        $this->assertStringContainsString('owner%40kitchen.test', (string) $handoff->json('whatsapp_url'));
    }
}
