<?php

namespace App\Modules\RevenueRecovery\Jobs;

use App\Modules\CRM\Domain\Models\Customer;
use App\Modules\Notifications\Infrastructure\WhatsApp\Contracts\WhatsAppProviderInterface;
use App\Modules\NotificationsCampaign\Application\Services\AudienceResolverService;
use App\Modules\NotificationsCampaign\Application\Services\CustomerNotificationPreferenceService;
use App\Modules\NotificationsCampaign\Application\Services\PushNotificationService;
use App\Modules\RevenueRecovery\Domain\Models\RevenueRecoveryCampaign;
use App\Shared\Tenancy\TenantContextRunner;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

class DeliverRevenueRecoveryNotificationJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;

    public int $backoff = 60;

    public function __construct(
        public string $campaignId,
        public string $tenantId,
        public string $title,
        public string $message,
        public string $restaurantName,
        public string $targetAudience = 'all',
    ) {}

    public function handle(
        TenantContextRunner $tenantContextRunner,
        AudienceResolverService $audienceResolver,
        PushNotificationService $pushService,
        CustomerNotificationPreferenceService $preferenceService,
        WhatsAppProviderInterface $whatsAppProvider,
    ): void {
        $tenantContextRunner->runForTenant($this->tenantId, function () use (
            $audienceResolver,
            $pushService,
            $preferenceService,
            $whatsAppProvider,
        ) {
            $campaign = RevenueRecoveryCampaign::withoutGlobalScopes()->find($this->campaignId);
            if (! $campaign) {
                return;
            }

            $customers = $audienceResolver->resolveOptedInCustomers(
                $this->tenantId,
                $this->targetAudience,
                'both',
            );

            $sent = 0;
            $delivered = 0;

            foreach ($customers as $customer) {
                $sent++;
                if ($this->deliver($customer, $pushService, $preferenceService, $whatsAppProvider)) {
                    $delivered++;
                }
            }

            $campaign->increment('notifications_sent', $sent);
            $campaign->increment('notifications_delivered', $delivered);
        });
    }

    private function deliver(
        Customer $customer,
        PushNotificationService $pushService,
        CustomerNotificationPreferenceService $preferenceService,
        WhatsAppProviderInterface $whatsAppProvider,
    ): bool {
        $pushOk = false;
        $whatsAppOk = false;
        $deepLink = '/menu?campaign='.$this->campaignId;

        if ($preferenceService->isPushOptedIn($this->tenantId, $customer->id)) {
            $pushOk = $pushService->send(
                $this->tenantId,
                $customer->id,
                $this->title,
                $this->message,
                [
                    'type' => 'revenue_recovery',
                    'campaign_id' => $this->campaignId,
                    'url' => $deepLink,
                ],
            );
        }

        if ($preferenceService->isWhatsAppOptedIn($this->tenantId, $customer->id) && $customer->phone) {
            try {
                $whatsAppProvider->send($customer->phone, $this->message, [
                    'type' => 'revenue_recovery',
                    'campaign_id' => $this->campaignId,
                ]);
                $whatsAppOk = true;
            } catch (\Throwable) {
                // provider logs failures
            }
        }

        return $pushOk || $whatsAppOk;
    }
}
