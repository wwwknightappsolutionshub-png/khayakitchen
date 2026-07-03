<?php

namespace App\Modules\NotificationsCampaign\Jobs;

use App\Modules\NotificationsCampaign\Application\Services\PushNotificationService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class SendPushNotificationJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;

    public int $backoff = 15;

    /**
     * @param  array<string, mixed>  $context
     */
    public function __construct(
        public string $tenantId,
        public string $customerId,
        public string $title,
        public string $body,
        public array $context = [],
    ) {}

    public function handle(PushNotificationService $pushService): void
    {
        try {
            $pushService->send($this->tenantId, $this->customerId, $this->title, $this->body, $this->context);
        } catch (\Throwable $e) {
            Log::warning('Push notification job failed', [
                'tenant_id' => $this->tenantId,
                'customer_id' => $this->customerId,
                'error' => $e->getMessage(),
            ]);

            throw $e;
        }
    }

    public function failed(\Throwable $exception): void
    {
        Log::info('Push notification job permanently failed', [
            'tenant_id' => $this->tenantId,
            'customer_id' => $this->customerId,
            'error' => $exception->getMessage(),
        ]);
    }
}
