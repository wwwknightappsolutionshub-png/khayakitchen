<?php

namespace App\Modules\Notifications\Jobs;

use App\Modules\CRM\Domain\Models\Customer;
use App\Modules\NotificationsCampaign\Application\Services\CustomerNotificationPreferenceService;
use App\Modules\Notifications\Infrastructure\WhatsApp\Contracts\WhatsAppProviderInterface;
use App\Shared\Tenancy\TenantContextRunner;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class SendWhatsAppMessageJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;

    public int $backoff = 30;

    public function __construct(
        public string $tenantId,
        public string $customerId,
        public string $orderId,
        public string $eventKey,
        public string $message,
    ) {}

    public function handle(
        WhatsAppProviderInterface $provider,
        TenantContextRunner $tenantContextRunner,
        CustomerNotificationPreferenceService $preferenceService,
    ): void {
        $tenantContextRunner->runForTenant($this->tenantId, function () use ($provider, $preferenceService) {
            $customer = Customer::query()->find($this->customerId);

            if (! $customer?->phone) {
                $this->logActivity('whatsapp.skipped', [
                    'reason' => 'missing_phone',
                    'event' => $this->eventKey,
                ]);

                return;
            }

            if (! $preferenceService->isWhatsAppOptedIn($this->tenantId, $this->customerId)) {
                $this->logActivity('whatsapp.skipped', [
                    'reason' => 'not_opted_in',
                    'event' => $this->eventKey,
                ]);

                return;
            }

            try {
                $provider->send($customer->phone, $this->message, [
                    'tenant_id' => $this->tenantId,
                    'order_id' => $this->orderId,
                    'event' => $this->eventKey,
                ]);

                $this->logActivity('whatsapp.sent', [
                    'event' => $this->eventKey,
                    'phone' => $customer->phone,
                ]);
            } catch (\Throwable $e) {
                $this->logActivity('whatsapp.failed', [
                    'event' => $this->eventKey,
                    'error' => $e->getMessage(),
                ]);

                throw $e;
            }
        });
    }

    public function failed(\Throwable $exception): void
    {
        $this->logActivity('whatsapp.failed_permanent', [
            'event' => $this->eventKey,
            'error' => $exception->getMessage(),
        ]);
    }

  /**
   * @param  array<string, mixed>  $metadata
   */
    private function logActivity(string $action, array $metadata): void
    {
        DB::table('activity_logs')->insert([
            'id' => (string) Str::uuid(),
            'tenant_id' => $this->tenantId,
            'user_id' => null,
            'action' => $action,
            'entity_type' => 'order',
            'entity_id' => $this->orderId,
            'metadata' => json_encode($metadata),
            'created_at' => now(),
        ]);
    }
}
