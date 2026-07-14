<?php

namespace App\Console\Commands;

use App\Modules\SeasonalPromo\Application\Services\TrialReminderService;
use Illuminate\Console\Command;

class SendTrialRemindersCommand extends Command
{
    protected $signature = 'trials:send-reminders {--dry-run : Count only, do not send}';

    protected $description = 'Email + in-app reminders 7 and 3 days before shared free-trial end for paid trial-only features';

    public function handle(TrialReminderService $reminderService): int
    {
        $result = $reminderService->sendDueReminders((bool) $this->option('dry-run'));
        $this->info(($this->option('dry-run') ? 'Would send' : 'Sent')." {$result['sent']} reminder(s); skipped {$result['skipped']}.");

        return self::SUCCESS;
    }
}
