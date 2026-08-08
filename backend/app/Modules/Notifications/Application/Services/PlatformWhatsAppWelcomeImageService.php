<?php

namespace App\Modules\Notifications\Application\Services;

use App\Modules\Notifications\Domain\Models\PlatformWhatsAppSettings;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

/**
 * Seeds and resolves the platform owner-welcome WhatsApp header image.
 * Source of truth: backend/resources/assets/whatsapp/owner-welcome.jpg
 * Persisted: path + public URL + base64 on platform_whatsapp_settings.
 *
 * Public fetch URL is Laravel /api/v1/public/whatsapp/owner-welcome.jpg (APP_URL),
 * not the Next.js frontend — Genius must receive a stable image/jpeg response.
 */
class PlatformWhatsAppWelcomeImageService
{
    public const STORAGE_PATH = 'platform/whatsapp/owner-welcome.jpg';

    public const SOURCE_RELATIVE = 'assets/whatsapp/owner-welcome.jpg';

    public const MIME = 'image/jpeg';

    public const PUBLIC_API_PATH = '/api/v1/public/whatsapp/owner-welcome.jpg';

    /**
     * @return array{path: ?string, url: ?string, mime: ?string, has_data: bool}
     */
    public function ensureSeeded(): array
    {
        $settings = $this->getOrCreateSettings();
        $source = resource_path(self::SOURCE_RELATIVE);

        if (! is_file($source)) {
            Log::warning('Owner welcome WhatsApp image source missing', ['path' => $source]);

            return $this->serialize($settings);
        }

        $binary = file_get_contents($source);
        if ($binary === false || $binary === '') {
            Log::warning('Owner welcome WhatsApp image source unreadable', ['path' => $source]);

            return $this->serialize($settings);
        }

        Storage::disk('public')->put(self::STORAGE_PATH, $binary);
        $publicUrl = $this->laravelPublicMediaUrl();

        $settings->update([
            'owner_welcome_image_path' => self::STORAGE_PATH,
            'owner_welcome_image_url' => $publicUrl,
            'owner_welcome_image_mime' => self::MIME,
            'owner_welcome_image_data' => base64_encode($binary),
        ]);

        return $this->serialize($settings->fresh() ?? $settings);
    }

    /**
     * Absolute HTTPS URL Genius/Meta can fetch, or null if unavailable.
     */
    public function resolvePublicUrl(?PlatformWhatsAppSettings $settings = null): ?string
    {
        $settings ??= $this->getOrCreateSettings();
        $canonical = $this->laravelPublicMediaUrl();

        if (! filled($settings->owner_welcome_image_data) || (string) $settings->owner_welcome_image_url !== $canonical) {
            $this->ensureSeeded();
            $settings = $settings->fresh() ?? $this->getOrCreateSettings();
        }

        $url = trim((string) ($settings->owner_welcome_image_url ?? ''));
        if ($url !== '') {
            return $this->absolutizeUrl($url);
        }

        return $canonical !== '' ? $canonical : null;
    }

    /**
     * Raw JPEG bytes from DB (preferred) or null.
     */
    public function resolveBinary(?PlatformWhatsAppSettings $settings = null): ?string
    {
        $settings ??= $this->getOrCreateSettings();

        if (filled($settings->owner_welcome_image_data)) {
            $decoded = base64_decode((string) $settings->owner_welcome_image_data, true);
            if (is_string($decoded) && $decoded !== '') {
                return $decoded;
            }
        }

        $this->ensureSeeded();
        $settings = $settings->fresh() ?? $this->getOrCreateSettings();

        if (filled($settings->owner_welcome_image_data)) {
            $decoded = base64_decode((string) $settings->owner_welcome_image_data, true);
            if (is_string($decoded) && $decoded !== '') {
                return $decoded;
            }
        }

        return null;
    }

    /**
     * @return array{path: ?string, url: ?string, mime: ?string, has_data: bool}
     */
    public function serialize(?PlatformWhatsAppSettings $settings = null): array
    {
        $settings ??= PlatformWhatsAppSettings::query()->first();

        return [
            'path' => $settings?->owner_welcome_image_path,
            'url' => $settings?->owner_welcome_image_url
                ? $this->absolutizeUrl((string) $settings->owner_welcome_image_url)
                : null,
            'mime' => $settings?->owner_welcome_image_mime,
            'has_data' => filled($settings?->owner_welcome_image_data),
        ];
    }

    private function getOrCreateSettings(): PlatformWhatsAppSettings
    {
        $settings = PlatformWhatsAppSettings::query()->first();
        if ($settings) {
            return $settings;
        }

        return PlatformWhatsAppSettings::create([
            'enabled' => false,
            'provider' => 'genius',
            'base_url' => config('whatsapp.genius.base_url'),
        ]);
    }

    /**
     * Laravel API host — nginx proxies /api to PHP, so Genius can fetch image/jpeg reliably.
     */
    private function laravelPublicMediaUrl(): string
    {
        $appUrl = rtrim((string) config('app.url', env('APP_URL', '')), '/');
        if ($appUrl === '') {
            return '';
        }

        return $appUrl.self::PUBLIC_API_PATH;
    }

    private function absolutizeUrl(string $url): string
    {
        $url = trim($url);
        if ($url === '') {
            return $url;
        }

        if (str_starts_with($url, 'http://') || str_starts_with($url, 'https://')) {
            return $url;
        }

        $appUrl = rtrim((string) config('app.url', env('APP_URL', 'http://localhost')), '/');

        return $appUrl.'/'.ltrim($url, '/');
    }
}
