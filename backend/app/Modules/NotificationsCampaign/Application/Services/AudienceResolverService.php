<?php

namespace App\Modules\NotificationsCampaign\Application\Services;

use App\Modules\CRM\Domain\Models\CrmProfile;
use App\Modules\CRM\Domain\Models\Customer;
use App\Modules\NotificationsCampaign\Domain\Models\CustomerNotificationPreference;
use Illuminate\Support\Collection;

class AudienceResolverService
{
    public function resolveOptedInCustomers(
        string $tenantId,
        string $targetAudience,
        string $channel,
    ): Collection {
        $query = Customer::query()
            ->where('tenant_id', $tenantId)
            ->whereHas('notificationPreference', function ($q) use ($channel) {
                if ($channel === 'pwa') {
                    $q->where('push_enabled', true);
                } elseif ($channel === 'whatsapp') {
                    $q->where('whatsapp_enabled', true);
                } else {
                    $q->where(function ($inner) {
                        $inner->where('push_enabled', true)
                            ->orWhere('whatsapp_enabled', true);
                    });
                }
            })
            ->with(['notificationPreference', 'profile']);

        if ($targetAudience === 'repeat_customers') {
            $query->whereHas('profile', fn ($q) => $q->whereBetween('order_count', [2, 5]));
        } elseif ($targetAudience === 'active_customers') {
            $query->whereHas('profile', fn ($q) => $q->where('last_order_at', '>=', now()->subDays(30)));
        }

        return $query->get();
    }

    public function segmentForProfile(?CrmProfile $profile): string
    {
        $count = $profile?->order_count ?? 0;

        if ($count >= 5) {
            return 'loyal';
        }

        if ($count >= 2) {
            return 'returning';
        }

        return 'new';
    }
}
