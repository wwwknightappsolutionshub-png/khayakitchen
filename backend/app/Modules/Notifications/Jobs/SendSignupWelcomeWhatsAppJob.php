<?php

namespace App\Modules\Notifications\Jobs;

use App\Modules\Platform\Application\Services\PublicSignupService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Throwable;

/**
 * Delivers the owner welcome WhatsApp after public signup.
 * Uses the queue worker (not PHP-FPM afterResponse) so Genius/Twilio sends are not killed
 * when nginx finishes the signup 201.
 */
class SendSignupWelcomeWhatsAppJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;

    public int $backoff = 20;

    /**
     * @param  array<string, mixed>  $result
     * @param  array<string, mixed>  $signupData
     */
    public function __construct(
        public string $ownerId,
        public string $tenantSlug,
        public array $result,
        public array $signupData,
        public string $planName,
    ) {}

    public function handle(PublicSignupService $signupService): void
    {
        Log::info('Signup welcome WhatsApp job started', [
            'owner_id' => $this->ownerId,
            'tenant_slug' => $this->tenantSlug,
            'attempt' => $this->attempts(),
        ]);

        $signupService->deliverPostSignupNotifications(
            $this->ownerId,
            $this->tenantSlug,
            $this->result,
            $this->signupData,
            $this->planName,
        );
    }

    public function failed(Throwable $exception): void
    {
        Log::error('Signup welcome WhatsApp job failed permanently', [
            'owner_id' => $this->ownerId,
            'tenant_slug' => $this->tenantSlug,
            'error' => $exception->getMessage(),
        ]);
    }
}
