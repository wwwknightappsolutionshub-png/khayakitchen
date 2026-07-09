<?php

namespace App\Modules\RevenueRecovery\Jobs;

use App\Modules\NotificationsCampaign\Application\Services\CustomerNotificationPreferenceService;
use App\Modules\NotificationsCampaign\Application\Services\PushNotificationService;
use App\Modules\RevenueRecovery\Application\Services\CustomerLocationService;
use App\Modules\RevenueRecovery\Application\Services\ProximityEvaluationService;
use App\Modules\RevenueRecovery\Application\Services\TenantRevenueRecoverySettingsService;
use App\Modules\RevenueRecovery\Domain\Models\CustomerSession;
use App\Modules\RevenueRecovery\Domain\Models\RevenueRecoveryCampaign;
use App\Shared\Tenancy\TenantContextRunner;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

class DeliverProximityBaitPushJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;

    public int $backoff = 60;

    public function __construct(
        public string $tenantId,
        public string $customerId,
    ) {}

    public function handle(
        TenantContextRunner $tenantContextRunner,
        CustomerLocationService $locationService,
        ProximityEvaluationService $evaluationService,
        TenantRevenueRecoverySettingsService $settingsService,
        PushNotificationService $pushService,
        CustomerNotificationPreferenceService $preferenceService,
    ): void {
        if (! $settingsService->isProximityEnabled($this->tenantId)) {
            return;
        }

        $tenantContextRunner->runForTenant($this->tenantId, function () use (
            $locationService,
            $evaluationService,
            $pushService,
            $preferenceService,
        ) {
            if (! $evaluationService->canSendPushToday($this->tenantId, $this->customerId)) {
                return;
            }

            if (! $preferenceService->isPushOptedIn($this->tenantId, $this->customerId)) {
                return;
            }

            $session = CustomerSession::withoutGlobalScopes()
                ->where('tenant_id', $this->tenantId)
                ->where('customer_id', $this->customerId)
                ->where('location_opt_in', true)
                ->where('expires_at', '>', now())
                ->orderByDesc('last_seen_at')
                ->first();

            if (! $session) {
                return;
            }

            $location = $locationService->latestForCustomer($this->tenantId, $this->customerId);
            if (! $location) {
                return;
            }

            $bait = $evaluationService->evaluateForCoordinates(
                $this->tenantId,
                $this->customerId,
                (float) $location->lat,
                (float) $location->lng,
                $location->accuracy_meters,
                \App\Modules\RevenueRecovery\Domain\Models\ProximityOfferEvent::CHANNEL_PUSH,
            );

            if (! $bait) {
                return;
            }

            $title = 'You are nearby';
            $message = (string) $bait['message'];
            $campaignId = (string) $bait['campaign_id'];

            $sent = $pushService->send(
                $this->tenantId,
                $this->customerId,
                $title,
                $message,
                [
                    'type' => 'proximity_bait',
                    'campaign_id' => $campaignId,
                    'url' => '/menu?proximity=1',
                ],
            );

            if ($sent) {
                $evaluationService->recordPushSent(
                    $this->tenantId,
                    $this->customerId,
                    $campaignId,
                    (float) $bait['distance_km'],
                    $message,
                );

                RevenueRecoveryCampaign::withoutGlobalScopes()
                    ->where('id', $campaignId)
                    ->increment('notifications_sent');
            }
        });
    }
}
