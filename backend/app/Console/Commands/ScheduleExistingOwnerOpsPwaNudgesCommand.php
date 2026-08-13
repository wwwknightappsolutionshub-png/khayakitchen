<?php

namespace App\Console\Commands;

use App\Modules\Platform\Application\Services\OpsPwaInstallNudgeService;
use Illuminate\Console\Command;

class ScheduleExistingOwnerOpsPwaNudgesCommand extends Command
{
    protected $signature = 'ops-pwa:schedule-existing-nudges';

    protected $description = 'Queue the one-time Ops PWA install email/WhatsApp for existing owners without KhayaOS Ops installed (480s delay)';

    public function handle(OpsPwaInstallNudgeService $nudgeService): int
    {
        $result = $nudgeService->scheduleExistingOwnersWave();
        if ($result['scheduled']) {
            $this->info("Scheduled existing-owner Ops PWA nudge in {$result['delay_seconds']} seconds.");
        } else {
            $this->info('Existing-owner Ops PWA nudge wave already scheduled — skipped.');
        }

        return self::SUCCESS;
    }
}
