<?php

namespace App\Console\Commands;

use App\Modules\Orders\Application\Services\OrderService;
use Illuminate\Console\Command;

class MarkUndoneOrdersCommand extends Command
{
    protected $signature = 'orders:mark-undone {--dry-run : Count only, do not update}';

    protected $description = 'Mark unfinished prior-day orders as undone (end-of-day cleanup)';

    public function handle(OrderService $orderService): int
    {
        $dryRun = (bool) $this->option('dry-run');
        $count = $orderService->markPriorDayOrdersUndone($dryRun);

        $this->info(($dryRun ? 'Would mark' : 'Marked')." {$count} order(s) as undone.");

        return self::SUCCESS;
    }
}
