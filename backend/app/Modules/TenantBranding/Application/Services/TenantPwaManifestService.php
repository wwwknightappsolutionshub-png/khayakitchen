<?php

namespace App\Modules\TenantBranding\Application\Services;

use App\Modules\Auth\Domain\Models\Tenant;
use App\Modules\Auth\Application\Services\TenantWorkspaceService;

class TenantPwaManifestService
{
    public function __construct(
        private BrandingService $brandingService,
        private TenantWorkspaceService $workspaceService,
    ) {}

    /**
     * @return array<string, mixed>
     */
    public function buildForSlug(string $slug): array
    {
        $tenant = Tenant::withoutGlobalScopes()
            ->where('slug', $slug)
            ->first();

        if (! $tenant) {
            abort(404, 'Tenant not found');
        }

        return $this->buildForTenant($tenant);
    }

    /**
     * @return array<string, mixed>
     */
    public function buildForTenant(Tenant $tenant): array
    {
        $branding = $this->brandingService->resolveEffective(
            $this->brandingService->getForTenant($tenant->id),
        );
        $workspace = $this->workspaceService->getPublicStorefrontConfig($tenant->id);
        $orderingPath = (string) ($workspace['ordering_path'] ?? ('/r/'.$tenant->slug));
        $name = (string) ($branding['restaurant_name'] ?: $tenant->name ?: 'Kitchen');
        $shortName = mb_substr($name, 0, 12);
        $themeColor = (string) ($branding['primary_color'] ?: '#E07A5F');
        $logoUrl = $this->absoluteIconUrl($branding['logo_url'] ?? null);
        $frontend = rtrim((string) config('app.frontend_url', 'http://localhost:3000'), '/');

        // Chrome installability requires 192 + 512 PNG icons; keep logo first when available.
        $icons = [
            [
                'src' => $frontend.'/icon-192.png',
                'sizes' => '192x192',
                'type' => 'image/png',
                'purpose' => 'any',
            ],
            [
                'src' => $frontend.'/icon-512.png',
                'sizes' => '512x512',
                'type' => 'image/png',
                'purpose' => 'any',
            ],
            [
                'src' => $frontend.'/icon-512.png',
                'sizes' => '512x512',
                'type' => 'image/png',
                'purpose' => 'maskable',
            ],
            [
                'src' => $logoUrl,
                'sizes' => 'any',
                'type' => $this->iconMimeType($logoUrl),
                'purpose' => 'any',
            ],
        ];

        return [
            'name' => $name,
            'short_name' => $shortName,
            'description' => 'Order from '.$name,
            'id' => $orderingPath,
            // Installed Order app opens featured Home. Footer Menu is `/menu`.
            // `/r/{slug}` remains the shared-link entry and still binds the kitchen.
            'start_url' => '/',
            'scope' => '/',
            'display' => 'standalone',
            'background_color' => '#F7F6F3',
            'theme_color' => $themeColor,
            'orientation' => 'portrait-primary',
            'prefer_related_applications' => false,
            'related_applications' => [
                [
                    'platform' => 'webapp',
                    'url' => '/pwa-manifest/'.$tenant->slug,
                ],
            ],
            'icons' => $icons,
        ];
    }

    private function absoluteIconUrl(?string $logoUrl): string
    {
        $frontend = rtrim((string) config('app.frontend_url', 'http://localhost:3000'), '/');
        if (! $logoUrl) {
            return $frontend.'/icon.svg';
        }

        if (str_starts_with($logoUrl, 'http://') || str_starts_with($logoUrl, 'https://')) {
            return $logoUrl;
        }

        if (str_starts_with($logoUrl, '/')) {
            return $frontend.$logoUrl;
        }

        return $frontend.'/'.$logoUrl;
    }

    private function iconMimeType(string $url): string
    {
        $path = strtolower(parse_url($url, PHP_URL_PATH) ?? '');
        if (str_ends_with($path, '.png')) {
            return 'image/png';
        }
        if (str_ends_with($path, '.jpg') || str_ends_with($path, '.jpeg')) {
            return 'image/jpeg';
        }
        if (str_ends_with($path, '.webp')) {
            return 'image/webp';
        }

        return 'image/svg+xml';
    }
}
