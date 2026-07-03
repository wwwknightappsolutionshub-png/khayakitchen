<?php

namespace App\Modules\NotificationsCampaign\Jobs;

use App\Modules\CRM\Domain\Models\Customer;
use App\Modules\Notifications\Infrastructure\WhatsApp\Contracts\WhatsAppProviderInterface;
use App\Modules\NotificationsCampaign\Application\Services\AudienceResolverService;
use App\Modules\NotificationsCampaign\Application\Services\CustomerNotificationPreferenceService;
use App\Modules\NotificationsCampaign\Application\Services\PushNotificationService;
use App\Shared\Tenancy\TenantContextRunner;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class DeliverPromoAlertJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;

    public int $backoff = 60;

    public function __construct(
        public string $tenantId,
        public string $message,
        public string $restaurantName,
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
            $customers = $audienceResolver->resolveOptedInCustomers($this->tenantId, 'all', 'both');
            $sent = 0;
            $delivered = 0;

            foreach ($customers as $customer) {
                $sent++;
                $ok = $this->deliver($customer, $pushService, $preferenceService, $whatsAppProvider);
                if ($ok) {
                    $delivered++;
                }
            }

            DB::table('audit_logs')->insert([
                'id' => (string) Str::uuid(),
                'tenant_id' => $this->tenantId,
                'user_id' => null,
                'action' => 'promo.alert.sent',
                'entity_type' => 'restaurant_status',
                'entity_id' => null,
                'metadata' => json_encode([
                    'sent' => $sent,
                    'delivered' => $delivered,
                    'restaurant' => $this->restaurantName,
                ]),
                'created_at' => now(),
            ]);
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

        if ($preferenceService->isPushOptedIn($this->tenantId, $customer->id)) {
            $pushOk = $pushService->send(
                $this->tenantId,
                $customer->id,
                "🔥 Offer at {$this->restaurantName}",
                $this->message,
                ['type' => 'promo_alert'],
            );
        }

        if ($preferenceService->isWhatsAppOptedIn($this->tenantId, $customer->id) && $customer->phone) {
            try {
                $whatsAppProvider->send($customer->phone, $this->message, ['type' => 'promo_alert']);
                $whatsAppOk = true;
            } catch (\Throwable) {
                // logged by provider layer
            }
        }

        return $pushOk || $whatsAppOk;
    }
}
