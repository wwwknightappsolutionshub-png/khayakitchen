<?php

namespace App\Modules\RevenueRecovery\Application\Services;

use App\Modules\Auth\Domain\Models\Tenant;
use App\Modules\Pricing\Application\Services\AuditLogService;
use App\Modules\RevenueRecovery\Domain\Models\TenantRevenueRecoverySettings;
use App\Shared\Entitlements\FeatureAccessService;
use App\Shared\Tenancy\TenantContext;
use Illuminate\Support\Collection;
use Illuminate\Validation\ValidationException;

class TenantRevenueRecoverySettingsService
{
    public const FEATURE_TIME_BASED = 'revenue_recovery.time_based';

    public const FEATURE_PROXIMITY = 'revenue_recovery.proximity';

    public function __construct(
        private TenantContext $tenantContext,
        private FeatureAccessService $featureAccessService,
        private GoogleGeocodingService $geocodingService,
        private AuditLogService $auditLogService,
    ) {}

    public function getOrCreateForTenant(string $tenantId): TenantRevenueRecoverySettings
    {
        $settings = TenantRevenueRecoverySettings::withoutGlobalScopes()
            ->where('tenant_id', $tenantId)
            ->first();

        if ($settings) {
            return $settings;
        }

        return TenantRevenueRecoverySettings::create([
            'tenant_id' => $tenantId,
            'time_based_enabled' => true,
            'proximity_enabled' => false,
            'geofence_radius_km' => 10,
            'tenant_can_edit_radius' => true,
            'proximity_bait_tiers' => TenantRevenueRecoverySettings::DEFAULT_BAIT_TIERS,
            'max_daily_proximity_pushes_per_customer' => 1,
            'location_accuracy_max_meters' => 500,
        ]);
    }

    /**
     * @return Collection<int, array<string, mixed>>
     */
    public function platformList(): Collection
    {
        $tenants = Tenant::withoutGlobalScopes()->orderBy('name')->get();

        return $tenants->map(function (Tenant $tenant) {
            $settings = $this->getOrCreateForTenant($tenant->id);

            return $this->serializeSettings($settings, $tenant);
        });
    }

    /**
     * @return array<string, mixed>
     */
    public function platformShow(string $tenantId): array
    {
        $tenant = Tenant::withoutGlobalScopes()->findOrFail($tenantId);
        $settings = $this->getOrCreateForTenant($tenantId);

        return $this->serializeSettings($settings, $tenant);
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public function platformUpdate(string $tenantId, array $data, ?string $actorUserId = null): TenantRevenueRecoverySettings
    {
        $settings = $this->getOrCreateForTenant($tenantId);
        $payload = $this->buildUpdatePayload($settings, $data, true);
        $settings->update($payload);

        $this->auditLogService->log(
            'platform.revenue_recovery_settings.updated',
            $tenantId,
            $actorUserId,
            'tenant_revenue_recovery_settings',
            $settings->id,
            $payload,
        );

        return $settings->fresh();
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public function tenantUpdate(array $data, array $permissions): TenantRevenueRecoverySettings
    {
        $this->authorizeManage($permissions);
        $tenantId = $this->tenantContext->id();
        $settings = $this->getOrCreateForTenant($tenantId);

        if (! $settings->tenant_can_edit_radius && array_key_exists('geofence_radius_km', $data)) {
            throw ValidationException::withMessages([
                'geofence_radius_km' => ['Your platform administrator has locked geofence radius editing.'],
            ]);
        }

        $payload = $this->buildUpdatePayload($settings, $data, false);
        $settings->update($payload);

        $this->auditLogService->log(
            'revenue_recovery.settings.updated',
            $tenantId,
            $this->tenantContext->user()?->id,
            'tenant_revenue_recovery_settings',
            $settings->id,
            $payload,
        );

        return $settings->fresh();
    }

    /**
     * @return array<string, mixed>
     */
    public function tenantShow(array $permissions): array
    {
        $this->authorizeView($permissions);
        $tenantId = $this->tenantContext->id();
        $settings = $this->getOrCreateForTenant($tenantId);

        return [
            'settings' => $this->serializeSettings($settings),
        ];
    }

    public function isTimeBasedEnabled(?string $tenantId = null): bool
    {
        $tenantId = $tenantId ?? $this->tenantContext->id();
        if (! $this->featureAccessService->canAccess(self::FEATURE_TIME_BASED, $tenantId)
            && ! $this->featureAccessService->canAccess('revenue_recovery', $tenantId)) {
            return false;
        }

        return $this->getOrCreateForTenant($tenantId)->time_based_enabled;
    }

    public function isProximityEnabled(?string $tenantId = null): bool
    {
        $tenantId = $tenantId ?? $this->tenantContext->id();
        if (! $this->featureAccessService->canAccess(self::FEATURE_PROXIMITY, $tenantId)) {
            return false;
        }

        $settings = $this->getOrCreateForTenant($tenantId);

        return $settings->proximity_enabled
            && $settings->kitchen_lat !== null
            && $settings->kitchen_lng !== null;
    }

    /**
     * @return array<string, mixed>
     */
    public function getStorefrontProximityConfig(?string $tenantId = null): array
    {
        $tenantId = $tenantId ?? $this->tenantContext->id();

        return [
            'enabled' => $this->isProximityEnabled($tenantId),
            'requires_email_verification' => true,
            'location_accuracy_max_meters' => $this->getOrCreateForTenant($tenantId)->location_accuracy_max_meters,
        ];
    }

    /**
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    private function buildUpdatePayload(
        TenantRevenueRecoverySettings $settings,
        array $data,
        bool $platform,
    ): array {
        $payload = [];

        if ($platform && array_key_exists('time_based_enabled', $data)) {
            $payload['time_based_enabled'] = (bool) $data['time_based_enabled'];
        }

        if ($platform && array_key_exists('proximity_enabled', $data)) {
            $payload['proximity_enabled'] = (bool) $data['proximity_enabled'];
        }

        if (array_key_exists('geofence_radius_km', $data)) {
            $radius = (float) $data['geofence_radius_km'];
            if ($radius < 1 || $radius > 50) {
                throw ValidationException::withMessages([
                    'geofence_radius_km' => ['Geofence radius must be between 1 and 50 km.'],
                ]);
            }
            $payload['geofence_radius_km'] = $radius;
        }

        if ($platform && array_key_exists('tenant_can_edit_radius', $data)) {
            $payload['tenant_can_edit_radius'] = (bool) $data['tenant_can_edit_radius'];
        }

        if (array_key_exists('proximity_bait_tiers', $data)) {
            $payload['proximity_bait_tiers'] = $this->normalizeBaitTiers($data['proximity_bait_tiers']);
        }

        if (array_key_exists('max_daily_proximity_pushes_per_customer', $data)) {
            $payload['max_daily_proximity_pushes_per_customer'] = max(
                1,
                min(5, (int) $data['max_daily_proximity_pushes_per_customer']),
            );
        }

        if (array_key_exists('location_accuracy_max_meters', $data)) {
            $payload['location_accuracy_max_meters'] = max(
                50,
                min(2000, (int) $data['location_accuracy_max_meters']),
            );
        }

        if (array_key_exists('kitchen_address_text', $data) && $data['kitchen_address_text']) {
            $geocoded = $this->geocodingService->geocodeAddress((string) $data['kitchen_address_text']);
            $payload['kitchen_address_text'] = $geocoded['formatted_address'] ?? (string) $data['kitchen_address_text'];
            $payload['kitchen_lat'] = $geocoded['lat'];
            $payload['kitchen_lng'] = $geocoded['lng'];
        }

        return $payload;
    }

    /**
     * @param  array<int, array<string, mixed>>|null  $tiers
     * @return array<int, array<string, mixed>>
     */
    private function normalizeBaitTiers(?array $tiers): array
    {
        if ($tiers === null || $tiers === []) {
            return TenantRevenueRecoverySettings::DEFAULT_BAIT_TIERS;
        }

        $normalized = [];
        foreach ($tiers as $tier) {
            $min = (float) ($tier['min_km'] ?? 0);
            $max = (float) ($tier['max_km'] ?? 0);
            $label = trim((string) ($tier['urgency_label'] ?? ''));
            if ($label === '' || $max <= $min) {
                continue;
            }
            $normalized[] = [
                'min_km' => $min,
                'max_km' => $max,
                'urgency_label' => $label,
            ];
        }

        if ($normalized === []) {
            throw ValidationException::withMessages([
                'proximity_bait_tiers' => ['Provide at least one valid proximity bait tier.'],
            ]);
        }

        return $normalized;
    }

    /**
     * @return array<string, mixed>
     */
    private function serializeSettings(
        TenantRevenueRecoverySettings $settings,
        ?Tenant $tenant = null,
    ): array {
        return [
            'tenant_id' => $settings->tenant_id,
            'tenant_name' => $tenant?->name,
            'tenant_slug' => $tenant?->slug,
            'time_based_enabled' => $settings->time_based_enabled,
            'proximity_enabled' => $settings->proximity_enabled,
            'geofence_radius_km' => (float) $settings->geofence_radius_km,
            'tenant_can_edit_radius' => $settings->tenant_can_edit_radius,
            'kitchen_lat' => $settings->kitchen_lat !== null ? (float) $settings->kitchen_lat : null,
            'kitchen_lng' => $settings->kitchen_lng !== null ? (float) $settings->kitchen_lng : null,
            'kitchen_address_text' => $settings->kitchen_address_text,
            'proximity_bait_tiers' => $settings->proximity_bait_tiers ?? TenantRevenueRecoverySettings::DEFAULT_BAIT_TIERS,
            'max_daily_proximity_pushes_per_customer' => $settings->max_daily_proximity_pushes_per_customer,
            'location_accuracy_max_meters' => $settings->location_accuracy_max_meters,
            'updated_at' => $settings->updated_at?->toIso8601String(),
        ];
    }

    private function authorizeView(array $permissions): void
    {
        if (! in_array('revenue_recovery.view', $permissions, true)
            && ! in_array('revenue_recovery.manage', $permissions, true)) {
            abort(403, 'Insufficient permissions');
        }
    }

    private function authorizeManage(array $permissions): void
    {
        if (! in_array('revenue_recovery.manage', $permissions, true)) {
            abort(403, 'Insufficient permissions');
        }

        if (! in_array($this->tenantContext->user()?->role, ['owner', 'super_admin'], true)) {
            abort(403, 'Only owners can manage revenue recovery settings');
        }
    }
}
