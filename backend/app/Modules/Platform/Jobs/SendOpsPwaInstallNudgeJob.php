<?php

namespace App\Modules\Platform\Jobs;

use App\Modules\Platform\Application\Services\OpsPwaInstallNudgeService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Throwable;

class SendOpsPwaInstallNudgeJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;

    /** @var list<int> */
    public array $backoff = [30, 60];

    public function __construct(public string $ownerId) {}

    public function handle(OpsPwaInstallNudgeService $nudgeService): void
    {
        $nudgeService->sendForOwnerId($this->ownerId);
    }

    public function failed(Throwable $exception): void
    {
        Log::error('ops_pwa_nudge.job_failed', [
            'owner_id' => $this->ownerId,
            'error' => $exception->getMessage(),
        ]);
    }
}
