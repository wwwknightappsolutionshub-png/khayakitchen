<?php

namespace App\Modules\Loyalty\Application\Services;

use App\Modules\Auth\Domain\Models\Tenant;
use App\Modules\CRM\Domain\Models\Customer;
use App\Modules\Loyalty\Domain\Models\LoyaltyAccount;
use App\Modules\Loyalty\Domain\Models\LoyaltyPackage;
use App\Modules\Loyalty\Mail\LoyaltyCustomerMail;
use App\Modules\Notifications\Infrastructure\WhatsApp\Contracts\WhatsAppProviderInterface;
use App\Modules\NotificationsCampaign\Application\Services\CustomerNotificationPreferenceService;
use App\Modules\NotificationsCampaign\Application\Services\PushNotificationService;
use App\Modules\TenantBranding\Domain\Models\TenantBranding;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

class LoyaltyNotificationService
{
    public function __construct(
        private PushNotificationService $pushNotificationService,
        private CustomerNotificationPreferenceService $preferenceService,
        private WhatsAppProviderInterface $whatsAppProvider,
    ) {}

    /**
     * Try email, in-app push, and WhatsApp — any channel that is available.
     *
     * @return array{email: bool, push: bool, whatsapp: bool}
     */
    public function notifyCustomer(
        string $tenantId,
        Customer $customer,
        string $title,
        string $body,
        array $context = [],
    ): array {
        $result = ['email' => false, 'push' => false, 'whatsapp' => false];
        $restaurant = $this->restaurantName($tenantId);

        if ($customer->email) {
            try {
                Mail::to($customer->email)->send(new LoyaltyCustomerMail(
                    $customer->name ?: 'there',
                    $restaurant,
                    $title,
                    $body,
                ));
                $result['email'] = true;
            } catch (\Throwable $e) {
                Log::warning('loyalty.email_failed', ['error' => $e->getMessage(), 'customer_id' => $customer->id]);
            }
        }

        // Avoid hanging PHPUnit on live push/WhatsApp network calls (QUEUE_CONNECTION=sync).
        if (app()->runningUnitTests()) {
            return $result;
        }

        if ($this->preferenceService->isPushOptedIn($tenantId, $customer->id)) {
            try {
                $result['push'] = $this->pushNotificationService->send(
                    $tenantId,
                    $customer->id,
                    $title,
                    $body,
                    array_merge(['type' => 'loyalty', 'url' => '/account'], $context),
                );
            } catch (\Throwable $e) {
                Log::warning('loyalty.push_failed', ['error' => $e->getMessage(), 'customer_id' => $customer->id]);
            }
        }

        if ($customer->phone && $this->preferenceService->isWhatsAppOptedIn($tenantId, $customer->id)) {
            try {
                $this->whatsAppProvider->send($customer->phone, $title."\n\n".$body, [
                    'type' => 'loyalty',
                    'tenant_id' => $tenantId,
                ]);
                $result['whatsapp'] = true;
            } catch (\Throwable $e) {
                Log::warning('loyalty.whatsapp_failed', ['error' => $e->getMessage(), 'customer_id' => $customer->id]);
            }
        }

        return $result;
    }

    public function packagesSummary(string $tenantId): string
    {
        $packages = LoyaltyPackage::withoutGlobalScopes()
            ->where('tenant_id', $tenantId)
            ->where('is_active', true)
            ->orderBy('sort_order')
            ->get();

        if ($packages->isEmpty()) {
            return "Earn stamps and points with every completed order. Check your Account page to redeem rewards.";
        }

        $lines = ["Your kitchen's loyalty packages:"];
        foreach ($packages as $package) {
            $goal = $package->package_type === 'stamp'
                ? $package->goal_value.' stamps'
                : $package->goal_value.' points';
            $lines[] = '• '.$package->name.': reach '.$goal.' → '.$package->reward_label;
        }
        $lines[] = '';
        $lines[] = 'How to redeem: open the restaurant PWA → Account → Loyalty, then redeem when a package is ready. Loyalty redeem cannot combine with waste-recovery discounts.';

        return implode("\n", $lines);
    }

    private function restaurantName(string $tenantId): string
    {
        $brand = TenantBranding::withoutGlobalScopes()->where('tenant_id', $tenantId)->value('restaurant_name');
        if ($brand) {
            return $brand;
        }

        return Tenant::withoutGlobalScopes()->where('id', $tenantId)->value('name') ?? 'Your kitchen';
    }
}
