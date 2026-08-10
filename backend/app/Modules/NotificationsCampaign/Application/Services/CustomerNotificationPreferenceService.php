<?php

namespace App\Modules\NotificationsCampaign\Application\Services;

use App\Modules\Auth\Domain\Models\FeatureFlag;
use App\Modules\CRM\Domain\Models\Customer;
use App\Modules\NotificationsCampaign\Domain\Models\CustomerNotificationPreference;
use App\Modules\NotificationsCampaign\Domain\Models\DeviceToken;
use App\Modules\Pricing\Application\Services\PlanLimitService;
use App\Shared\Tenancy\TenantContext;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class CustomerNotificationPreferenceService
{
    public function __construct(
        private TenantContext $tenantContext,
        private PlanLimitService $planLimitService,
    ) {}

    /**
     * Create opt-in preferences (all channels on) when the customer has none yet.
     */
    public function ensureDefaultOptIns(string $tenantId, Customer $customer): CustomerNotificationPreference
    {
        $existing = CustomerNotificationPreference::withoutGlobalScopes()
            ->where('tenant_id', $tenantId)
            ->where('customer_id', $customer->id)
            ->first();

        if ($existing) {
            return $existing;
        }

        return CustomerNotificationPreference::create([
            'tenant_id' => $tenantId,
            'customer_id' => $customer->id,
            'push_enabled' => true,
            'whatsapp_enabled' => true,
            'email_enabled' => true,
        ]);
    }

    public function upsertByPhone(
        string $tenantId,
        string $phone,
        ?string $name,
        bool $pushEnabled,
        bool $whatsappEnabled,
        bool $emailEnabled = true,
    ): CustomerNotificationPreference {
        return DB::transaction(function () use ($tenantId, $phone, $name, $pushEnabled, $whatsappEnabled, $emailEnabled) {
            $customer = Customer::withoutGlobalScopes()
                ->where('tenant_id', $tenantId)
                ->where('phone', $phone)
                ->first();

            if (! $customer) {
                $this->planLimitService->assertCustomerLimit($tenantId);
                $customer = Customer::withoutGlobalScopes()->create([
                    'tenant_id' => $tenantId,
                    'name' => $name ?? 'Guest',
                    'phone' => $phone,
                ]);
            } elseif ($name && $customer->name === 'Guest') {
                $customer->update(['name' => $name]);
            }

            return CustomerNotificationPreference::updateOrCreate(
                ['tenant_id' => $tenantId, 'customer_id' => $customer->id],
                [
                    'push_enabled' => $pushEnabled,
                    'whatsapp_enabled' => $whatsappEnabled,
                    'email_enabled' => $emailEnabled,
                ],
            );
        });
    }

    public function registerDeviceToken(string $tenantId, string $customerId, string $token, string $platform = 'web'): DeviceToken
    {
        return DeviceToken::updateOrCreate(
            ['tenant_id' => $tenantId, 'device_token' => $token],
            [
                'customer_id' => $customerId,
                'user_id' => null,
                'platform' => $platform,
                'created_at' => now(),
            ],
        );
    }

    public function registerStaffDeviceToken(string $tenantId, string $userId, string $token, string $platform = 'web'): DeviceToken
    {
        return DeviceToken::updateOrCreate(
            ['tenant_id' => $tenantId, 'device_token' => $token],
            [
                'customer_id' => null,
                'user_id' => $userId,
                'platform' => $platform,
                'created_at' => now(),
            ],
        );
    }

    public function isWhatsAppOptedIn(string $tenantId, string $customerId): bool
    {
        $pref = CustomerNotificationPreference::withoutGlobalScopes()
            ->where('tenant_id', $tenantId)
            ->where('customer_id', $customerId)
            ->first();

        if (! $pref) {
            return true;
        }

        return (bool) $pref->whatsapp_enabled;
    }

    public function isPushOptedIn(string $tenantId, string $customerId): bool
    {
        $pref = CustomerNotificationPreference::withoutGlobalScopes()
            ->where('tenant_id', $tenantId)
            ->where('customer_id', $customerId)
            ->first();

        if (! $pref) {
            return true;
        }

        return (bool) $pref->push_enabled;
    }

    /**
     * Transactional email: opt-in when preference says so, or when no preference row exists yet.
     */
    public function isEmailOptedIn(string $tenantId, string $customerId): bool
    {
        $pref = CustomerNotificationPreference::withoutGlobalScopes()
            ->where('tenant_id', $tenantId)
            ->where('customer_id', $customerId)
            ->first();

        if (! $pref) {
            return true;
        }

        return (bool) $pref->email_enabled;
    }
}
