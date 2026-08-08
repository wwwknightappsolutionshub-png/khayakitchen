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

    public function test_whatsapp_test_treats_genius_timeout_as_soft_success(): void
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

        $response->assertOk();
        $response->assertJsonPath('sent', true);
        $this->assertNotEmpty($response->json('warning'));
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

        PlatformWhatsAppSettings::create([
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
}
