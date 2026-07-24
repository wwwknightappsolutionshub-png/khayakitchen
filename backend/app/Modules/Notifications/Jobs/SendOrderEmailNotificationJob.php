<?php

namespace App\Modules\Notifications\Jobs;

use App\Modules\Auth\Domain\Models\Tenant;
use App\Modules\CRM\Domain\Models\Customer;
use App\Modules\Notifications\Mail\CustomerOrderStatusMail;
use App\Modules\NotificationsCampaign\Application\Services\CustomerNotificationPreferenceService;
use App\Modules\TenantBranding\Domain\Models\TenantBranding;
use App\Shared\Tenancy\TenantContextRunner;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;

class SendOrderEmailNotificationJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;

    public int $backoff = 30;

    public function __construct(
        public string $tenantId,
        public string $customerId,
        public string $orderId,
        public string $eventKey,
        public string $subject,
        public string $body,
    ) {}

    public function handle(
        TenantContextRunner $tenantContextRunner,
        CustomerNotificationPreferenceService $preferenceService,
    ): void {
        $tenantContextRunner->runForTenant($this->tenantId, function () use ($preferenceService) {
            $customer = Customer::query()->find($this->customerId);

            if (! $customer?->email) {
                $this->logActivity('order.email.skipped', [
                    'reason' => 'missing_email',
                    'event' => $this->eventKey,
                ]);

                return;
            }

            if (! $preferenceService->isEmailOptedIn($this->tenantId, $this->customerId)) {
                $this->logActivity('order.email.skipped', [
                    'reason' => 'not_opted_in',
                    'event' => $this->eventKey,
                ]);

                return;
            }

            try {
                Mail::to($customer->email)->send(new CustomerOrderStatusMail(
                    $customer->name ?: 'there',
                    $this->restaurantName(),
                    $this->subject,
                    $this->body,
                ));

                $this->logActivity('order.email.sent', [
                    'event' => $this->eventKey,
                    'email' => $customer->email,
                ]);
            } catch (\Throwable $e) {
                $this->logActivity('order.email.failed', [
                    'event' => $this->eventKey,
                    'error' => $e->getMessage(),
                ]);

                throw $e;
            }
        });
    }

    public function failed(\Throwable $exception): void
    {
        $this->logActivity('order.email.failed_permanent', [
            'event' => $this->eventKey,
            'error' => $exception->getMessage(),
        ]);
    }

    private function restaurantName(): string
    {
        $brand = TenantBranding::withoutGlobalScopes()
            ->where('tenant_id', $this->tenantId)
            ->value('restaurant_name');

        if ($brand) {
            return $brand;
        }

        return Tenant::withoutGlobalScopes()->where('id', $this->tenantId)->value('name') ?? 'Your kitchen';
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
