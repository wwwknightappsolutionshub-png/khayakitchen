<?php

namespace App\Console\Commands;

use App\Modules\NotificationsCampaign\Application\Services\CampaignTimingIntelligenceService;
use Illuminate\Console\Command;

class ProcessCampaignTimingSuggestionsCommand extends Command
{
    protected $signature = 'campaign-timing:process-suggestions';

    protected $description = 'Learn tenant sales rhythms and auto-suggest campaign timing into inbox';

    public function handle(CampaignTimingIntelligenceService $service): int
    {
        $count = $service->processDueSuggestions();
        $this->info("Created {$count} campaign timing suggestion(s).");

        return self::SUCCESS;
    }
}
