<?php

namespace App\Modules\NotificationsCampaign\Jobs;

use App\Modules\CRM\Domain\Models\Customer;
use App\Modules\Notifications\Infrastructure\WhatsApp\Contracts\WhatsAppProviderInterface;
use App\Modules\NotificationsCampaign\Application\Services\AudienceResolverService;
use App\Modules\NotificationsCampaign\Application\Services\CampaignService;
use App\Modules\NotificationsCampaign\Application\Services\CustomerNotificationPreferenceService;
use App\Modules\NotificationsCampaign\Application\Services\PushNotificationService;
use App\Modules\NotificationsCampaign\Domain\Models\NotificationCampaign;
use App\Shared\Tenancy\TenantContextRunner;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class DeliverCampaignJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;

    public int $backoff = 60;

    public function __construct(
        public string $campaignId,
        public string $tenantId,
    ) {}

    public function handle(
        TenantContextRunner $tenantContextRunner,
        AudienceResolverService $audienceResolver,
        PushNotificationService $pushService,
        CustomerNotificationPreferenceService $preferenceService,
        WhatsAppProviderInterface $whatsAppProvider,
        CampaignService $campaignService,
    ): void {
        $tenantContextRunner->runForTenant($this->tenantId, function () use (
            $audienceResolver,
            $pushService,
            $preferenceService,
            $whatsAppProvider,
            $campaignService,
        ) {
            $campaign = NotificationCampaign::find($this->campaignId);

            if (! $campaign || $campaign->status === 'sent') {
                return;
            }

            $customers = $audienceResolver->resolveOptedInCustomers(
                $campaign->tenant_id,
                $campaign->target_audience,
                $campaign->channel,
            );

            $sent = 0;
            $delivered = 0;
            $failed = 0;

            foreach ($customers as $customer) {
                $sent++;
                $success = $this->deliverToCustomer(
                    $campaign,
                    $customer,
                    $pushService,
                    $preferenceService,
                    $whatsAppProvider,
                );

                if ($success) {
                    $delivered++;
                } else {
                    $failed++;
                }
            }

            $campaign->update([
                'status' => 'sent',
                'sent_at' => now(),
                'sent_count' => $sent,
                'delivered_count' => $delivered,
                'failed_count' => $failed,
            ]);

            $campaignService->logActivity('campaign.sent', $campaign, [
                'sent' => $sent,
                'delivered' => $delivered,
                'failed' => $failed,
            ]);
        });
    }

    private function deliverToCustomer(
        NotificationCampaign $campaign,
        Customer $customer,
        PushNotificationService $pushService,
        CustomerNotificationPreferenceService $preferenceService,
        WhatsAppProviderInterface $whatsAppProvider,
    ): bool {
        $channel = $campaign->channel;
        $pushOk = false;
        $whatsAppOk = false;

        if (in_array($channel, ['pwa', 'both'], true)
            && $preferenceService->isPushOptedIn($campaign->tenant_id, $customer->id)) {
            $pushOk = $pushService->send(
                $campaign->tenant_id,
                $customer->id,
                $campaign->title,
                $campaign->message,
                ['campaign_id' => $campaign->id],
            );
        }

        if (in_array($channel, ['whatsapp', 'both'], true)
            && $preferenceService->isWhatsAppOptedIn($campaign->tenant_id, $customer->id)
            && $customer->phone) {
            try {
                $whatsAppProvider->send($customer->phone, $campaign->message, [
                    'campaign_id' => $campaign->id,
                    'type' => 'campaign',
                ]);
                $this->logWhatsApp($campaign, $customer, 'campaign.whatsapp.sent');
                $whatsAppOk = true;
            } catch (\Throwable $e) {
                $this->logWhatsApp($campaign, $customer, 'campaign.whatsapp.failed', $e->getMessage());
            }
        }

        return $pushOk || $whatsAppOk;
    }

    private function logWhatsApp(
        NotificationCampaign $campaign,
        Customer $customer,
        string $action,
        ?string $error = null,
    ): void {
        DB::table('activity_logs')->insert([
            'id' => (string) Str::uuid(),
            'tenant_id' => $campaign->tenant_id,
            'user_id' => null,
            'action' => $action,
            'entity_type' => 'notification_campaign',
            'entity_id' => $campaign->id,
            'metadata' => json_encode([
                'customer_id' => $customer->id,
                'error' => $error,
            ]),
            'created_at' => now(),
        ]);
    }
}
