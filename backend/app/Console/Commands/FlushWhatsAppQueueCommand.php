<?php

namespace App\Console\Commands;

use App\Modules\Notifications\Application\Services\WhatsAppQueueFlushService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;

/**
 * CLI wrapper around WhatsAppQueueFlushService for VPS / ops use.
 */
class FlushWhatsAppQueueCommand extends Command
{
    protected $signature = 'whatsapp:flush-queue
        {--dry-run : Show matching jobs without deleting}
        {--failed : Also delete matching rows from failed_jobs}
        {--include-mixed : Also flush promo/campaign/revenue jobs that may send WhatsApp (can drop email/push for those same jobs)}
        {--force : Skip confirmation prompt}';

    protected $description = 'Flush pending/reserved WhatsApp queue jobs (and optionally failed jobs) to protect Genius quota';

    public function handle(WhatsAppQueueFlushService $flushService): int
    {
        $includeMixed = (bool) $this->option('include-mixed');
        $includeFailed = (bool) $this->option('failed');
        $status = $flushService->status($includeMixed);

        $this->table(
            ['Source', 'Matching rows'],
            [
                ['jobs pending', (string) $status['pending']],
                ['jobs reserved', (string) $status['reserved']],
                ['failed_jobs', $includeFailed ? (string) $status['failed'] : 'skipped'],
            ],
        );

        $this->line('Matched job markers:');
        foreach ($status['markers'] as $marker) {
            $this->line('  - '.$marker);
        }

        $total = $status['pending'] + $status['reserved'] + ($includeFailed ? $status['failed'] : 0);
        if ($total === 0) {
            $this->info('Nothing to flush.');

            return self::SUCCESS;
        }

        if ($this->option('dry-run')) {
            $this->warn('Dry run only — no rows deleted.');

            return self::SUCCESS;
        }

        if (! $this->option('force')
            && ! $this->confirm('Delete these WhatsApp-related queue rows? Prefer stopping khayaos-queue first.', true)
        ) {
            $this->warn('Aborted.');

            return self::FAILURE;
        }

        $result = $flushService->flush($includeFailed, $includeMixed);

        Log::warning('WhatsApp queue flushed to protect Genius quota', $result);

        $this->info(
            "Deleted {$result['deleted_jobs']} from jobs"
            .($includeFailed ? ", {$result['deleted_failed_jobs']} from failed_jobs" : '')
            .'.',
        );
        $this->comment('After Genius quota is restored: pm2 restart khayaos-queue — only new events will enqueue.');

        return self::SUCCESS;
    }
}
