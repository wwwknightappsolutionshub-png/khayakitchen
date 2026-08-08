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
 * Primary delivery path for signup welcome WhatsApp.
 * Dispatched after tenant create so the public signup HTTP response is never blocked
 * by Genius/Twilio latency (which previously caused false "Server Error" after success).
 */
class SendSignupWelcomeWhatsAppJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 5;

    /** @var list<int> */
    public array $backoff = [10, 30, 60, 120];

    /** Genius send is capped at ~20s; keep under DB retry_after (120). */
    public int $timeout = 45;

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
