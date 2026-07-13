<?php

namespace Tests\Feature;

use App\Modules\Auth\Domain\Models\Tenant;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TenantPwaManifestTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed();
    }

    public function test_pwa_manifest_is_served_for_tenant_slug(): void
    {
        $tenant = Tenant::where('slug', 'pilot')->firstOrFail();

        $response = $this->get('/api/v1/storefront/pwa-manifest/'.$tenant->slug);

        $response->assertOk();
        $response->assertHeader('Content-Type', 'application/manifest+json');
        $response->assertJsonPath('start_url', '/r/pilot');
        $response->assertJsonPath('id', '/r/pilot');
        $response->assertJsonPath('display', 'standalone');
        $this->assertNotEmpty($response->json('name'));
        $this->assertIsArray($response->json('icons'));
        $this->assertNotEmpty($response->json('icons'));
        $iconSrcs = collect($response->json('icons'))->pluck('src')->implode(' ');
        $this->assertStringContainsString('icon-192.png', $iconSrcs);
        $this->assertStringContainsString('icon-512.png', $iconSrcs);
    }

    public function test_pwa_manifest_returns_404_for_unknown_slug(): void
    {
        $response = $this->get('/api/v1/storefront/pwa-manifest/does-not-exist-tenant');

        $response->assertNotFound();
    }

    public function test_storefront_includes_pwa_install_metadata(): void
    {
        $response = $this->getJson('/api/v1/storefront', [
            'X-Tenant-Slug' => 'pilot',
        ]);

        $response->assertOk();
        $response->assertJsonPath('pwa.manifest_path', '/pwa-manifest/pilot');
        $response->assertJsonPath('pwa.start_url', '/r/pilot');
        $response->assertJsonPath('pwa.installable', true);
    }
}
