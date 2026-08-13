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

class ScheduleExistingOwnerOpsPwaNudgesJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;

    public function handle(OpsPwaInstallNudgeService $nudgeService): void
    {
        $result = $nudgeService->sendExistingOwnersWave();
        Log::info('ops_pwa_nudge.existing_wave_complete', $result);
    }

    public function failed(Throwable $exception): void
    {
        Log::error('ops_pwa_nudge.existing_wave_failed', [
            'error' => $exception->getMessage(),
        ]);
    }
}
