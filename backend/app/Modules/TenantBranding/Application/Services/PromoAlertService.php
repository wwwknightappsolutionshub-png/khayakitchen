<?php

namespace App\Modules\TenantBranding\Application\Services;

use App\Modules\NotificationsCampaign\Application\Services\AudienceResolverService;
use App\Modules\NotificationsCampaign\Jobs\DeliverPromoAlertJob;
use App\Modules\Pricing\Application\Services\AuditLogService;
use App\Modules\TenantBranding\Domain\Models\RestaurantStatus;
use App\Modules\TenantBranding\Domain\Models\TenantBranding;
use App\Shared\Entitlements\FeatureAccessService;

class PromoAlertService
{
    public function __construct(
        private FeatureAccessService $featureAccessService,
        private AudienceResolverService $audienceResolver,
        private AuditLogService $auditLogService,
    ) {}

    public function handlePromoModeActivated(RestaurantStatus $status): void
    {
        $tenantId = $status->tenant_id;

        if (! config('tenant_branding.promo_alerts_globally_enabled', true)) {
            $this->logSkipped($tenantId, 'global_disabled');

            return;
        }

        if (! $status->promo_alerts_enabled) {
            $this->logSkipped($tenantId, 'tenant_disabled');

            return;
        }

        if (! $this->featureAccessService->canAccess('notification_campaigns', $tenantId)) {
            $this->logSkipped($tenantId, 'feature_disabled');

            return;
        }

        if ($this->isWithinCooldown($status)) {
            $this->logSkipped($tenantId, 'cooldown_active');

            return;
        }

        $audience = $this->audienceResolver->resolveOptedInCustomers($tenantId, 'all', 'both');
        if ($audience->isEmpty()) {
            $this->logSkipped($tenantId, 'no_opted_in_customers');

            return;
        }

        $branding = TenantBranding::withoutGlobalScopes()->where('tenant_id', $tenantId)->first();
        $restaurantName = $branding?->restaurant_name ?? 'our restaurant';
        $message = "🔥 Limited time offer now live at {$restaurantName}. Order before it ends.";

        $status->update(['last_promo_alert_at' => now()]);

        DeliverPromoAlertJob::dispatch($tenantId, $message, $restaurantName);

        $this->auditLogService->log(
            'promo.alert.scheduled',
            $tenantId,
            null,
            'restaurant_status',
            $status->id,
            ['audience_size' => $audience->count(), 'message' => $message],
        );
    }

    private function isWithinCooldown(RestaurantStatus $status): bool
    {
        if (! $status->last_promo_alert_at) {
            return false;
        }

        $hours = (int) config('tenant_branding.promo_alert_cooldown_hours', 6);

        return $status->last_promo_alert_at->gt(now()->subHours($hours));
    }

    private function logSkipped(string $tenantId, string $reason): void
    {
        $this->auditLogService->log(
            'promo.alert.skipped',
            $tenantId,
            null,
            'restaurant_status',
            null,
            ['reason' => $reason],
        );
    }
}
