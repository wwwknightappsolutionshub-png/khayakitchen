<?php

namespace Tests\Feature;

use App\Modules\Auth\Domain\Models\User;
use App\Modules\Notifications\Application\Services\WhatsAppCredentialResolver;
use App\Modules\Notifications\Domain\Models\PlatformWhatsAppSettings;
use App\Modules\Notifications\Infrastructure\WhatsApp\Providers\GeniusWhatsAppProvider;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class PlatformWhatsAppSettingsTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed();
    }

    public function test_super_admin_can_configure_genius_whatsapp_sender(): void
    {
        $admin = User::where('email', 'admin@khayaos.com')->firstOrFail();
        $token = $admin->createToken('test')->plainTextToken;

        $show = $this->getJson('/api/v1/platform/whatsapp', [
            'Authorization' => "Bearer {$token}",
        ]);
        $show->assertOk();
        $show->assertJsonPath('whatsapp.enabled', false);
        $show->assertJsonPath('whatsapp.provider', 'genius');
        $show->assertJsonPath('whatsapp.configured', false);
        $show->assertJsonPath('whatsapp.owner_welcome_image.has_data', true);

        $update = $this->patchJson('/api/v1/platform/whatsapp', [
            'enabled' => true,
            'provider' => 'genius',
            'api_key' => 'api-a4dc0f2c265e879bed8b50e4e0f1f53b46b742684dafa6',
            'session_id' => 'session_test_kitchen',
            'base_url' => 'https://restapi.geniusdevel.com',
        ], [
            'Authorization' => "Bearer {$token}",
        ]);
        $update->assertOk();
        $update->assertJsonPath('whatsapp.enabled', true);
        $update->assertJsonPath('whatsapp.has_api_key', true);
        $update->assertJsonPath('whatsapp.session_id', 'session_test_kitchen');
        $update->assertJsonPath('whatsapp.configured', true);
        $update->assertJsonPath('whatsapp.active_provider', 'genius');

        $this->assertDatabaseHas('platform_whatsapp_settings', [
            'enabled' => true,
            'provider' => 'genius',
            'session_id' => 'session_test_kitchen',
        ]);

        $resolved = app(WhatsAppCredentialResolver::class)->resolve(null);
        $this->assertSame('platform', $resolved['source']);
        $this->assertSame('genius', $resolved['provider']);
        $this->assertSame('api-a4dc0f2c265e879bed8b50e4e0f1f53b46b742684dafa6', $resolved['genius']['api_key']);
        $this->assertSame('session_test_kitchen', $resolved['genius']['session_id']);
        $this->assertTrue(app(WhatsAppCredentialResolver::class)->hasSendableCredentials(null));
    }

    public function test_super_admin_can_send_platform_whatsapp_test_message(): void
    {
        Http::fake([
            'restapi.geniusdevel.com/*' => Http::response(['ok' => true], 200),
        ]);

        $admin = User::where('email', 'admin@khayaos.com')->firstOrFail();
        $token = $admin->createToken('test')->plainTextToken;

        $this->patchJson('/api/v1/platform/whatsapp', [
            'enabled' => true,
            'provider' => 'genius',
            'api_key' => 'api-test-key',
            'session_id' => 'session_test',
            'base_url' => 'https://restapi.geniusdevel.com',
        ], [
            'Authorization' => "Bearer {$token}",
        ])->assertOk();

        $response = $this->postJson('/api/v1/platform/whatsapp/test', [
            'phone' => '+447756183484',
            'message' => 'Super Admin diagnostic ping',
        ], [
            'Authorization' => "Bearer {$token}",
        ]);

        $response->assertOk();
        $response->assertJsonPath('sent', true);
        $response->assertJsonPath('phone', '+447756183484');
        $response->assertJsonPath('provider', 'genius');

        Http::assertSent(function ($request) {
            return $request->url() === 'https://restapi.geniusdevel.com/api/send'
                && $request['number'] === '447756183484'
                && $request['message'] === 'Super Admin diagnostic ping';
        });
    }

    public function test_whatsapp_test_survives_audit_log_failure_after_send(): void
    {
        Http::fake([
            'restapi.geniusdevel.com/*' => Http::response(['ok' => true], 200),
        ]);

        $admin = User::where('email', 'admin@khayaos.com')->firstOrFail();
        $token = $admin->createToken('test')->plainTextToken;

        $this->patchJson('/api/v1/platform/whatsapp', [
            'enabled' => true,
            'provider' => 'genius',
            'api_key' => 'api-test-key',
            'session_id' => 'session_test',
            'base_url' => 'https://restapi.geniusdevel.com',
        ], [
            'Authorization' => "Bearer {$token}",
        ])->assertOk();

        // Soft-fail audit must never turn a confirmed Genius send into HTTP 500.
        $audit = \Mockery::mock(\App\Modules\Pricing\Application\Services\AuditLogService::class);
        $audit->shouldReceive('log')->andThrow(new \RuntimeException('audit boom'));
        $this->app->instance(\App\Modules\Pricing\Application\Services\AuditLogService::class, $audit);

        $response = $this->postJson('/api/v1/platform/whatsapp/test', [
            'phone' => '+447756183484',
            'message' => 'Audit failure should not 500',
        ], [
            'Authorization' => "Bearer {$token}",
        ]);

        $response->assertOk();
        $response->assertJsonPath('sent', true);
    }

    public function test_whatsapp_test_reports_genius_timeout_as_not_confirmed(): void
    {
        Http::fake([
            'restapi.geniusdevel.com/*' => function () {
                throw new \Illuminate\Http\Client\ConnectionException('cURL error 28: Operation timed out');
            },
        ]);

        $admin = User::where('email', 'admin@khayaos.com')->firstOrFail();
        $token = $admin->createToken('test')->plainTextToken;

        $this->patchJson('/api/v1/platform/whatsapp', [
            'enabled' => true,
            'provider' => 'genius',
            'api_key' => 'api-test-key',
            'session_id' => 'session_test',
            'base_url' => 'https://restapi.geniusdevel.com',
        ], [
            'Authorization' => "Bearer {$token}",
        ])->assertOk();

        $response = $this->postJson('/api/v1/platform/whatsapp/test', [
            'phone' => '+447756183484',
        ], [
            'Authorization' => "Bearer {$token}",
        ]);

        $response->assertStatus(422);
        $response->assertJsonPath('code', 'WHATSAPP_TEST_FAILED');
        $this->assertStringContainsString('did not confirm', (string) $response->json('message'));
    }

    public function test_whatsapp_test_rejects_incomplete_credentials(): void
    {
        $admin = User::where('email', 'admin@khayaos.com')->firstOrFail();
        $token = $admin->createToken('test')->plainTextToken;

        $response = $this->postJson('/api/v1/platform/whatsapp/test', [
            'phone' => '+447756183484',
        ], [
            'Authorization' => "Bearer {$token}",
        ]);

        $response->assertStatus(422);
    }

    public function test_genius_provider_posts_to_send_endpoint(): void
    {
        Http::fake([
            'restapi.geniusdevel.com/*' => Http::response(['ok' => true], 200),
        ]);

        PlatformWhatsAppSettings::query()->first()?->update([
            'enabled' => true,
            'provider' => 'genius',
            'api_key' => 'api-test-key',
            'session_id' => 'session_abc',
            'base_url' => 'https://restapi.geniusdevel.com',
        ]) ?? PlatformWhatsAppSettings::create([
            'enabled' => true,
            'provider' => 'genius',
            'api_key' => 'api-test-key',
            'session_id' => 'session_abc',
            'base_url' => 'https://restapi.geniusdevel.com',
        ]);

        app(GeniusWhatsAppProvider::class)->sendWithCredentials(
            '+447700900123',
            'Hello from KhayaOS',
            [
                'api_key' => 'api-test-key',
                'session_id' => 'session_abc',
                'base_url' => 'https://restapi.geniusdevel.com',
            ],
            ['tenant_id' => 'platform'],
        );

        Http::assertSent(function ($request) {
            return $request->url() === 'https://restapi.geniusdevel.com/api/send'
                && $request->hasHeader('x-api-key', 'api-test-key')
                && $request['sessionId'] === 'session_abc'
                && $request['number'] === '447700900123'
                && $request['type'] === 'text'
                && $request['message'] === 'Hello from KhayaOS'
                && $request['source'] === 'API';
        });
    }

    public function test_genius_provider_posts_image_when_media_url_present(): void
    {
        Http::fake([
            'restapi.geniusdevel.com/*' => Http::response(['ok' => true], 200),
        ]);

        app(GeniusWhatsAppProvider::class)->sendWithCredentials(
            '+447700900123',
            '*Welcome aboard*',
            [
                'api_key' => 'api-test-key',
                'session_id' => 'session_abc',
                'base_url' => 'https://restapi.geniusdevel.com',
            ],
            [
                'type' => 'owner_welcome',
                'media_url' => 'https://khayaos.prohost.cloud/whatsapp/owner-welcome.jpg',
            ],
        );

        Http::assertSent(function ($request) {
            return $request->url() === 'https://restapi.geniusdevel.com/api/send'
                && $request['type'] === 'image'
                && $request['message'] === '*Welcome aboard*'
                && $request['url'] === 'https://khayaos.prohost.cloud/whatsapp/owner-welcome.jpg'
                && $request['mediaUrl'] === 'https://khayaos.prohost.cloud/whatsapp/owner-welcome.jpg'
                && $request['source'] === 'API';
        });
    }

    public function test_public_welcome_image_endpoint_returns_jpeg(): void
    {
        app(\App\Modules\Notifications\Application\Services\PlatformWhatsAppWelcomeImageService::class)
            ->ensureSeeded();

        $response = $this->get('/api/v1/public/whatsapp/owner-welcome.jpg');
        $response->assertOk();
        $response->assertHeader('Content-Type', 'image/jpeg');
        $this->assertGreaterThan(1000, strlen($response->getContent()));
    }

    public function test_welcome_image_seeder_persists_image_in_database(): void
    {
        $this->assertTrue(
            is_file(resource_path('assets/whatsapp/owner-welcome.jpg')),
            'Expected owner-welcome.jpg source asset in resources/assets/whatsapp',
        );

        $result = app(\App\Modules\Notifications\Application\Services\PlatformWhatsAppWelcomeImageService::class)
            ->ensureSeeded();

        $this->assertTrue($result['has_data']);
        $this->assertNotEmpty($result['url']);
        $this->assertSame('image/jpeg', $result['mime']);
        $this->assertDatabaseHas('platform_whatsapp_settings', [
            'owner_welcome_image_path' => 'platform/whatsapp/owner-welcome.jpg',
            'owner_welcome_image_mime' => 'image/jpeg',
        ]);

        $row = PlatformWhatsAppSettings::query()->firstOrFail();
        $this->assertNotEmpty($row->owner_welcome_image_data);
        $decoded = base64_decode((string) $row->owner_welcome_image_data, true);
        $this->assertIsString($decoded);
        $this->assertGreaterThan(1000, strlen($decoded));
    }

    public function test_genius_provider_throws_when_api_rejects_send(): void
    {
        Http::fake([
            'restapi.geniusdevel.com/*' => Http::response(['error' => 'rate limited'], 429),
        ]);

        $this->expectException(\RuntimeException::class);
        $this->expectExceptionMessage('Genius API error');

        app(GeniusWhatsAppProvider::class)->sendWithCredentials(
            '+447700900123',
            'Hello from KhayaOS',
            [
                'api_key' => 'api-test-key',
                'session_id' => 'session_abc',
                'base_url' => 'https://restapi.geniusdevel.com',
            ],
            ['type' => 'owner_welcome'],
        );
    }

    public function test_super_admin_can_view_and_flush_whatsapp_queue(): void
    {
        $admin = User::where('email', 'admin@khayaos.com')->firstOrFail();
        $token = $admin->createToken('test')->plainTextToken;

        \Illuminate\Support\Facades\DB::table('jobs')->insert([
            [
                'queue' => 'default',
                'payload' => json_encode([
                    'displayName' => 'App\\Modules\\Notifications\\Jobs\\SendWhatsAppMessageJob',
                    'data' => ['commandName' => 'App\\Modules\\Notifications\\Jobs\\SendWhatsAppMessageJob'],
                ]),
                'attempts' => 0,
                'reserved_at' => null,
                'available_at' => now()->getTimestamp(),
                'created_at' => now()->getTimestamp(),
            ],
            [
                'queue' => 'default',
                'payload' => json_encode([
                    'displayName' => 'App\\Modules\\Notifications\\Jobs\\SendOrderEmailNotificationJob',
                    'data' => ['commandName' => 'App\\Modules\\Notifications\\Jobs\\SendOrderEmailNotificationJob'],
                ]),
                'attempts' => 0,
                'reserved_at' => null,
                'available_at' => now()->getTimestamp(),
                'created_at' => now()->getTimestamp(),
            ],
        ]);

        \Illuminate\Support\Facades\DB::table('failed_jobs')->insert([
            'uuid' => (string) \Illuminate\Support\Str::uuid(),
            'connection' => 'database',
            'queue' => 'default',
            'payload' => json_encode([
                'displayName' => 'App\\Modules\\Notifications\\Jobs\\SendSignupWelcomeWhatsAppJob',
            ]),
            'exception' => 'Genius quota',
            'failed_at' => now(),
        ]);

        $status = $this->getJson('/api/v1/platform/whatsapp/queue', [
            'Authorization' => "Bearer {$token}",
        ]);
        $status->assertOk();
        $status->assertJsonPath('queue.pending', 1);
        $status->assertJsonPath('queue.failed', 1);

        $flush = $this->postJson('/api/v1/platform/whatsapp/queue/flush', [
            'include_failed' => true,
            'include_mixed' => false,
        ], [
            'Authorization' => "Bearer {$token}",
        ]);
        $flush->assertOk();
        $flush->assertJsonPath('flush.deleted_jobs', 1);
        $flush->assertJsonPath('flush.deleted_failed_jobs', 1);
        $flush->assertJsonPath('queue.pending', 0);
        $flush->assertJsonPath('queue.failed', 0);

        $this->assertSame(1, \Illuminate\Support\Facades\DB::table('jobs')->count());
        $this->assertSame(0, \Illuminate\Support\Facades\DB::table('failed_jobs')->count());
    }
}
