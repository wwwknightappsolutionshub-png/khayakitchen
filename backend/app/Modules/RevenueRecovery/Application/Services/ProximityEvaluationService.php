<?php

namespace App\Modules\RevenueRecovery\Application\Services;

use App\Modules\RevenueRecovery\Domain\Models\CustomerSession;
use App\Modules\RevenueRecovery\Domain\Models\ProximityOfferEvent;
use App\Modules\RevenueRecovery\Domain\Models\RevenueRecoveryCampaign;
use App\Modules\RevenueRecovery\Domain\Models\TenantRevenueRecoverySettings;
use App\Modules\TenantBranding\Application\Services\BrandingService;
use App\Shared\Tenancy\TenantContext;
use Illuminate\Support\Facades\DB;

class ProximityEvaluationService
{
    public function __construct(
        private TenantContext $tenantContext,
        private TenantRevenueRecoverySettingsService $settingsService,
        private BrandingService $brandingService,
    ) {}

    /**
     * @return array<string, mixed>|null
     */
    public function evaluateForCoordinates(
        string $tenantId,
        string $customerId,
        float $lat,
        float $lng,
        ?int $accuracyMeters,
        string $channel = ProximityOfferEvent::CHANNEL_IN_APP,
    ): ?array {
        if (! $this->settingsService->isProximityEnabled($tenantId)) {
            return null;
        }

        $settings = $this->settingsService->getOrCreateForTenant($tenantId);

        if ($accuracyMeters !== null && $accuracyMeters > $settings->location_accuracy_max_meters) {
            return null;
        }

        if ($settings->kitchen_lat === null || $settings->kitchen_lng === null) {
            return null;
        }

        $distanceKm = $this->haversineKm(
            (float) $settings->kitchen_lat,
            (float) $settings->kitchen_lng,
            $lat,
            $lng,
        );

        if ($distanceKm > (float) $settings->geofence_radius_km) {
            return null;
        }

        $proximityCampaign = $this->getActiveProximityCampaign($tenantId);
        if (! $proximityCampaign) {
            return null;
        }

        $timeBasedCampaign = $this->getActiveTimeBasedCampaign($tenantId);
        $tiers = $proximityCampaign->proximity_bait_tiers
            ?? $settings->proximity_bait_tiers
            ?? TenantRevenueRecoverySettings::DEFAULT_BAIT_TIERS;

        $tier = $this->resolveTier($tiers, $distanceKm);
        $message = $this->buildBaitMessage(
            $distanceKm,
            $tier,
            $timeBasedCampaign,
            $this->brandingService->getForTenant($tenantId)->restaurant_name ?? 'Our kitchen',
        );

        $payload = [
            'campaign_id' => $proximityCampaign->id,
            'distance_km' => round($distanceKm, 1),
            'urgency_label' => $tier['urgency_label'] ?? 'You are nearby',
            'message' => $message,
            'has_active_time_based_offer' => $timeBasedCampaign !== null,
            'time_based_campaign_name' => $timeBasedCampaign?->name,
            'time_based_discount_percent' => $timeBasedCampaign && $timeBasedCampaign->discount_type === RevenueRecoveryCampaign::DISCOUNT_PERCENT
                ? (int) $timeBasedCampaign->discount_value
                : null,
            'channel' => $channel,
        ];

        if ($channel === ProximityOfferEvent::CHANNEL_IN_APP) {
            $this->recordEvent(
                $tenantId,
                $customerId,
                $proximityCampaign->id,
                ProximityOfferEvent::CHANNEL_IN_APP,
                ProximityOfferEvent::TYPE_IMPRESSION,
                $distanceKm,
                $message,
            );

            DB::transaction(function () use ($proximityCampaign) {
                $locked = RevenueRecoveryCampaign::withoutGlobalScopes()
                    ->lockForUpdate()
                    ->find($proximityCampaign->id);
                $locked?->increment('proximity_impressions');
            });
        }

        return $payload;
    }

    /**
     * @return array<string, mixed>|null
     */
    public function evaluateForSession(
        CustomerSession $session,
        float $lat,
        float $lng,
        ?int $accuracyMeters,
    ): ?array {
        return $this->evaluateForCoordinates(
            $session->tenant_id,
            $session->customer_id,
            $lat,
            $lng,
            $accuracyMeters,
            ProximityOfferEvent::CHANNEL_IN_APP,
        );
    }

    public function canSendPushToday(string $tenantId, string $customerId): bool
    {
        $settings = $this->settingsService->getOrCreateForTenant($tenantId);
        $max = $settings->max_daily_proximity_pushes_per_customer;

        $sentToday = ProximityOfferEvent::withoutGlobalScopes()
            ->where('tenant_id', $tenantId)
            ->where('customer_id', $customerId)
            ->where('event_type', ProximityOfferEvent::TYPE_PUSH_SENT)
            ->where('created_at', '>=', now()->startOfDay())
            ->count();

        return $sentToday < $max;
    }

    public function recordPushSent(
        string $tenantId,
        string $customerId,
        string $campaignId,
        float $distanceKm,
        string $message,
    ): void {
        $this->recordEvent(
            $tenantId,
            $customerId,
            $campaignId,
            ProximityOfferEvent::CHANNEL_PUSH,
            ProximityOfferEvent::TYPE_PUSH_SENT,
            $distanceKm,
            $message,
        );

        RevenueRecoveryCampaign::withoutGlobalScopes()
            ->where('id', $campaignId)
            ->increment('proximity_push_sent');
    }

    public function recordDismissed(
        string $tenantId,
        string $customerId,
        ?string $campaignId,
        ?float $distanceKm,
    ): void {
        $this->recordEvent(
            $tenantId,
            $customerId,
            $campaignId,
            ProximityOfferEvent::CHANNEL_IN_APP,
            ProximityOfferEvent::TYPE_DISMISSED,
            $distanceKm,
            null,
        );
    }

    /**
     * @param  array<int, array<string, mixed>>  $tiers
     * @return array<string, mixed>
     */
    private function resolveTier(array $tiers, float $distanceKm): array
    {
        usort($tiers, fn ($a, $b) => ((float) ($a['min_km'] ?? 0)) <=> ((float) ($b['min_km'] ?? 0)));

        $matched = $tiers[0] ?? ['urgency_label' => 'You are nearby'];
        foreach ($tiers as $tier) {
            $min = (float) ($tier['min_km'] ?? 0);
            $max = (float) ($tier['max_km'] ?? PHP_FLOAT_MAX);
            if ($distanceKm >= $min && $distanceKm < $max) {
                $matched = $tier;
                break;
            }
        }

        return $matched;
    }

    private function buildBaitMessage(
        float $distanceKm,
        array $tier,
        ?RevenueRecoveryCampaign $timeBasedCampaign,
        string $restaurantName,
    ): string {
        $distanceLabel = number_format($distanceKm, 1).' km';
        $urgency = $tier['urgency_label'] ?? 'You are nearby';

        if ($timeBasedCampaign) {
            $discount = $timeBasedCampaign->discount_type === RevenueRecoveryCampaign::DISCOUNT_PERCENT
                ? (int) $timeBasedCampaign->discount_value.'% off'
                : 'a special offer';

            return "{$urgency} — you are about {$distanceLabel} from {$restaurantName}. "
                ."{$timeBasedCampaign->name} is live now with {$discount} on selected meals. Order before it ends!";
        }

        return "{$urgency} — you are about {$distanceLabel} from {$restaurantName}. "
            .'Stop by and order pickup — fresh meals ready when you arrive.';
    }

    private function getActiveProximityCampaign(string $tenantId): ?RevenueRecoveryCampaign
    {
        return RevenueRecoveryCampaign::withoutGlobalScopes()
            ->where('tenant_id', $tenantId)
            ->where('campaign_type', RevenueRecoveryCampaign::TYPE_PROXIMITY)
            ->where('status', RevenueRecoveryCampaign::STATUS_ACTIVE)
            ->where('starts_at', '<=', now())
            ->where('ends_at', '>=', now())
            ->first();
    }

    private function getActiveTimeBasedCampaign(string $tenantId): ?RevenueRecoveryCampaign
    {
        if (! $this->settingsService->isTimeBasedEnabled($tenantId)) {
            return null;
        }

        return RevenueRecoveryCampaign::withoutGlobalScopes()
            ->where('tenant_id', $tenantId)
            ->where('campaign_type', '!=', RevenueRecoveryCampaign::TYPE_PROXIMITY)
            ->where('status', RevenueRecoveryCampaign::STATUS_ACTIVE)
            ->where('starts_at', '<=', now())
            ->where('ends_at', '>=', now())
            ->where(function ($query) {
                $query->whereNull('redemption_limit')
                    ->orWhereColumn('redemption_count', '<', 'redemption_limit');
            })
            ->orderByDesc('discount_value')
            ->first();
    }

    private function haversineKm(float $lat1, float $lng1, float $lat2, float $lng2): float
    {
        $earthRadius = 6371;
        $dLat = deg2rad($lat2 - $lat1);
        $dLng = deg2rad($lng2 - $lng1);
        $a = sin($dLat / 2) ** 2
            + cos(deg2rad($lat1)) * cos(deg2rad($lat2)) * sin($dLng / 2) ** 2;

        return $earthRadius * (2 * atan2(sqrt($a), sqrt(1 - $a)));
    }

    private function recordEvent(
        string $tenantId,
        string $customerId,
        ?string $campaignId,
        string $channel,
        string $eventType,
        ?float $distanceKm,
        ?string $message,
    ): void {
        ProximityOfferEvent::create([
            'tenant_id' => $tenantId,
            'customer_id' => $customerId,
            'campaign_id' => $campaignId,
            'channel' => $channel,
            'event_type' => $eventType,
            'distance_km' => $distanceKm,
            'message' => $message,
            'created_at' => now(),
        ]);
    }
}
