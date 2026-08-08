<?php

namespace App\Modules\Notifications\Interfaces\Controllers;

use App\Modules\Notifications\Application\Services\PlatformWhatsAppWelcomeImageService;
use Illuminate\Routing\Controller;
use Symfony\Component\HttpFoundation\Response;

/**
 * Public JPEG for Genius/Meta to fetch as WhatsApp image media.
 * Served via Laravel /api (port 8080) — not Next.js — so the URL is stable.
 */
class PlatformWhatsAppWelcomeImageController extends Controller
{
    public function __construct(private PlatformWhatsAppWelcomeImageService $welcomeImage) {}

    public function show(): Response
    {
        $this->welcomeImage->ensureSeeded();
        $binary = $this->welcomeImage->resolveBinary();

        if (! is_string($binary) || $binary === '') {
            return response('Welcome image unavailable', 404);
        }

        return response($binary, 200, [
            'Content-Type' => PlatformWhatsAppWelcomeImageService::MIME,
            'Content-Length' => (string) strlen($binary),
            'Cache-Control' => 'public, max-age=86400',
            'X-Content-Type-Options' => 'nosniff',
        ]);
    }
}
