<?php

namespace App\Modules\Platform\Jobs;

use App\Modules\Platform\Application\Services\PublicSignupService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

/**
 * Queued so SMTP / WhatsApp cannot block or time out the signup HTTP response.
 */
class SendSignupNotificationsJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;

    public int $backoff = 30;

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
        $signupService->deliverPostSignupNotifications(
            $this->ownerId,
            $this->tenantSlug,
            $this->signupResult,
            $this->signupData,
            $this->planName,
        );
    }
}
