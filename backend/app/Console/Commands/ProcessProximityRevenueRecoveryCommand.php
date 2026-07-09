<?php

namespace App\Console\Commands;

use App\Modules\RevenueRecovery\Application\Services\ProximityEvaluationService;
use App\Modules\RevenueRecovery\Application\Services\TenantRevenueRecoverySettingsService;
use App\Modules\RevenueRecovery\Domain\Models\CustomerLocation;
use App\Modules\RevenueRecovery\Domain\Models\CustomerSession;
use App\Modules\RevenueRecovery\Jobs\DeliverProximityBaitPushJob;
use Illuminate\Console\Command;

class ProcessProximityRevenueRecoveryCommand extends Command
{
    protected $signature = 'revenue-recovery:process-proximity';

    protected $description = 'Evaluate customer proximity heartbeats and queue bait push notifications';

    public function handle(
        TenantRevenueRecoverySettingsService $settingsService,
        ProximityEvaluationService $evaluationService,
    ): int {
        $processed = 0;

        $enabledTenantIds = \App\Modules\RevenueRecovery\Domain\Models\TenantRevenueRecoverySettings::withoutGlobalScopes()
            ->where('proximity_enabled', true)
            ->whereNotNull('kitchen_lat')
            ->whereNotNull('kitchen_lng')
            ->pluck('tenant_id');

        foreach ($enabledTenantIds as $tenantId) {
            if (! $settingsService->isProximityEnabled($tenantId)) {
                continue;
            }

            $sessions = CustomerSession::withoutGlobalScopes()
                ->where('tenant_id', $tenantId)
                ->where('location_opt_in', true)
                ->where('expires_at', '>', now())
                ->get();

            foreach ($sessions as $session) {
                $location = CustomerLocation::withoutGlobalScopes()
                    ->where('tenant_id', $tenantId)
                    ->where('customer_id', $session->customer_id)
                    ->where('captured_at', '>=', now()->subHours(2))
                    ->orderByDesc('captured_at')
                    ->first();

                if (! $location) {
                    continue;
                }

                if (! $evaluationService->canSendPushToday($tenantId, $session->customer_id)) {
                    continue;
                }

                DeliverProximityBaitPushJob::dispatch($tenantId, $session->customer_id);
                $processed++;
            }
        }

        $this->info("Queued {$processed} proximity bait push job(s).");

        return self::SUCCESS;
    }
}
