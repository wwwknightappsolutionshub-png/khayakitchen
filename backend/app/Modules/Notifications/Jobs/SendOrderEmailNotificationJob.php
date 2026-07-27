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

            $brand = $this->branding();
            $isThanks = $this->eventKey === 'OrderCompleted';
            $subject = $isThanks
                ? ('Thanks for ordering from '.$brand['name'].'!')
                : $this->subject;
            $body = $isThanks
                ? "Thank you for ordering with {$brand['name']}. We hope everything was delicious — here's how to stay close to the kitchen."
                : $this->body;

            try {
                Mail::to($customer->email)->send(new CustomerOrderStatusMail(
                    $customer->name ?: 'there',
                    $brand['name'],
                    $subject,
                    $body,
                    $brand['logo'],
                    $isThanks ? $this->thanksCtas($brand['slug']) : null,
                ));

                $this->logActivity($isThanks ? 'order.email.thanks_sent' : 'order.email.sent', [
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

    /**
     * @return array{name: string, logo: ?string, slug: string}
     */
    private function branding(): array
    {
        $tenant = Tenant::withoutGlobalScopes()->find($this->tenantId);
        $brand = TenantBranding::withoutGlobalScopes()
            ->where('tenant_id', $this->tenantId)
            ->first();

        return [
            'name' => $brand?->restaurant_name ?: ($tenant?->name ?? 'Your kitchen'),
            'logo' => $brand?->platform_override_logo_url ?: $brand?->logo_url,
            'slug' => $tenant?->slug ?? '',
        ];
    }

    /**
     * @return list<array{label: string, url: string, hint?: string}>
     */
    private function thanksCtas(string $slug): array
    {
        $frontend = rtrim((string) config('app.frontend_url', env('FRONTEND_URL', 'http://localhost:3000')), '/');
        $entry = $slug !== '' ? "{$frontend}/r/{$slug}" : $frontend;
        $account = $slug !== '' ? "{$frontend}/r/{$slug}" : "{$frontend}/account";

        return [
            [
                'label' => 'Leave a review',
                'url' => $entry.(str_contains($entry, '?') ? '&' : '?').'review=1',
                'hint' => 'Tell the kitchen how service went — it helps them improve.',
            ],
            [
                'label' => 'Open your account',
                'url' => $account,
                'hint' => 'Register or sign in to save addresses and reorder faster.',
            ],
            [
                'label' => 'Install the app (PWA)',
                'url' => $entry,
                'hint' => 'Add to your home screen for one-tap ordering next time.',
            ],
            [
                'label' => 'Loyalty & rewards',
                'url' => $account,
                'hint' => 'Check stamps, points, and rewards in your Account.',
            ],
        ];
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
