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
        $this->assertStringNotContainsStringIgnoringCase('KhayaOS Ops', (string) $response->json('name'));
        $this->assertStringStartsWith('Order from ', (string) $response->json('description'));
        $this->assertIsArray($response->json('icons'));
        $this->assertNotEmpty($response->json('icons'));
        $iconSrcs = collect($response->json('icons'))->pluck('src')->implode(' ');
        $this->assertStringContainsString('icon-192.png', $iconSrcs);
        $this->assertStringContainsString('icon-512.png', $iconSrcs);
        $this->assertStringNotContainsString('icon-ops', $iconSrcs);
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

    public function test_ops_manifest_file_has_distinct_identity(): void
    {
        $path = dirname(__DIR__, 3).DIRECTORY_SEPARATOR.'frontend'.DIRECTORY_SEPARATOR.'public'.DIRECTORY_SEPARATOR.'manifest-ops.json';
        $this->assertFileExists($path);

        $manifest = json_decode((string) file_get_contents($path), true, 512, JSON_THROW_ON_ERROR);
        $this->assertSame('/ops', $manifest['id']);
        $this->assertSame('/ops/login', $manifest['start_url']);
        $this->assertSame('/ops/', $manifest['scope']);
        $this->assertSame('KhayaOS Ops', $manifest['name']);
        $this->assertSame('Khaya Ops', $manifest['short_name']);

        $iconSrcs = collect($manifest['icons'] ?? [])->pluck('src')->implode(' ');
        $this->assertStringContainsString('icon-ops-192.png', $iconSrcs);
        $this->assertStringContainsString('icon-ops-512.png', $iconSrcs);
        $this->assertStringNotContainsString('/icon-192.png', $iconSrcs);

        $ops192 = dirname(__DIR__, 3).DIRECTORY_SEPARATOR.'frontend'.DIRECTORY_SEPARATOR.'public'.DIRECTORY_SEPARATOR.'icon-ops-192.png';
        $customer192 = dirname(__DIR__, 3).DIRECTORY_SEPARATOR.'frontend'.DIRECTORY_SEPARATOR.'public'.DIRECTORY_SEPARATOR.'icon-192.png';
        $this->assertFileExists($ops192);
        $this->assertFileExists($customer192);
        $this->assertNotSame(
            hash_file('sha256', $ops192),
            hash_file('sha256', $customer192),
            'Ops PNG must be visually distinct from customer PNG',
        );
    }
}
