<?php

namespace App\Console\Commands;

use App\Modules\RevenueRecovery\Application\Services\RevenueRecoveryCampaignService;
use Illuminate\Console\Command;

class ProcessRevenueRecoveryScheduleCommand extends Command
{
    protected $signature = 'revenue-recovery:process-schedule';

    protected $description = 'Activate scheduled revenue recovery campaigns and deactivate expired ones';

    public function handle(RevenueRecoveryCampaignService $service): int
    {
        $count = $service->processScheduledCampaigns();
        $this->info("Processed {$count} revenue recovery campaign state change(s).");

        return self::SUCCESS;
    }
}
