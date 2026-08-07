<?php

namespace App\Modules\Platform\Jobs;

use App\Modules\Platform\Application\Services\PublicSignupService;
use Illuminate\Bus\Queueable;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

/**
 * Welcome WhatsApp ~30s after signup HTTP response (not a queue-worker job).
 * Verification email is sent synchronously during register(); this never waits for email verify.
 */
class SendSignupNotificationsJob
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public const WHATSAPP_DELAY_SECONDS = 30;

    /**
     * @param  array<string, mixed>  $signupResult
     * @param  array<string, mixed>  $signupData
     */
    public function __construct(
        public string $ownerId,
        public string $tenantSlug,
        public array $signupResult,
        public array $signupData,
        public string $planName,
    ) {}

    public function handle(PublicSignupService $signupService): void
    {
        // Release the client connection before sleeping (PHP-FPM). Without this,
        // afterResponse still holds the browser request open → network timeout UI.
        if (function_exists('fastcgi_finish_request')) {
            @fastcgi_finish_request();
        }

        Log::info('Signup WhatsApp delay started', [
            'owner_id' => $this->ownerId,
            'delay_seconds' => self::WHATSAPP_DELAY_SECONDS,
        ]);

        sleep(self::WHATSAPP_DELAY_SECONDS);

        $signupService->deliverPostSignupNotifications(
            $this->ownerId,
            $this->tenantSlug,
            $this->signupResult,
            $this->signupData,
            $this->planName,
        );
    }
}
