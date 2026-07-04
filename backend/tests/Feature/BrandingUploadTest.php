<?php

namespace Tests\Feature;

use App\Modules\Auth\Domain\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class BrandingUploadTest extends TestCase
{
    use RefreshDatabase;

    public function test_tenant_owner_can_upload_logo_and_banner(): void
    {
        Storage::fake('public');
        $this->seed();

        $owner = User::where('email', 'owner@khayaos.com')->firstOrFail();
        $token = $owner->createToken('test')->plainTextToken;
        $headers = [
            'Authorization' => "Bearer {$token}",
            'X-Tenant-Slug' => 'pilot',
        ];

        $logoResponse = $this->post('/api/v1/branding/logo', [
            'image' => UploadedFile::fake()->image('logo.png'),
        ], $headers);

        $logoResponse->assertOk();
        $logoResponse->assertJsonStructure(['branding' => ['logo_url']]);
        $this->assertNotNull($logoResponse->json('branding.logo_url'));

        $bannerResponse = $this->post('/api/v1/branding/banner', [
            'image' => UploadedFile::fake()->image('banner.png'),
        ], $headers);

        $bannerResponse->assertOk();
        $bannerResponse->assertJsonStructure(['branding' => ['banner_image']]);
        $this->assertNotNull($bannerResponse->json('branding.banner_image'));
    }

    public function test_public_platform_config_is_available(): void
    {
        $this->seed();

        $response = $this->getJson('/api/v1/platform/public-config');

        $response->assertOk();
        $response->assertJsonPath('app_name', 'KhayaOS');
        $response->assertJsonPath('splash_enabled', true);
    }

    public function test_super_admin_can_update_platform_splash_settings(): void
    {
        $this->seed();

        $admin = User::where('email', 'admin@khayaos.com')->firstOrFail();
        $token = $admin->createToken('test')->plainTextToken;

        $response = $this->patchJson('/api/v1/platform/settings', [
            'splash_headline' => 'Welcome to Khaya Kitchen',
            'splash_enabled' => true,
        ], [
            'Authorization' => "Bearer {$token}",
        ]);

        $response->assertOk();
        $response->assertJsonPath('settings.splash_headline', 'Welcome to Khaya Kitchen');
    }
}
