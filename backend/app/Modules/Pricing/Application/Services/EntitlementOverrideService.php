<?php

namespace App\Modules\Pricing\Application\Services;

use App\Modules\Pricing\Domain\Models\TenantEntitlementOverride;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

class EntitlementOverrideService
{
    public function __construct(
        private AuditLogService $auditLogService,
    ) {}

    public function listForTenant(string $tenantId)
    {
        return TenantEntitlementOverride::where('tenant_id', $tenantId)
            ->active()
            ->orderBy('override_type')
            ->orderBy('override_key')
            ->get();
    }

    public function setFeatureOverride(
        string $tenantId,
        string $featureKey,
        bool $enabled,
        bool $isPermanent = true,
        ?string $expiresAt = null,
        ?string $reason = null,
        ?string $userId = null,
    ): TenantEntitlementOverride {
        $override = TenantEntitlementOverride::updateOrCreate(
            [
                'tenant_id' => $tenantId,
                'override_type' => 'feature',
                'override_key' => $featureKey,
            ],
            [
                'value_bool' => $enabled,
                'is_permanent' => $isPermanent,
                'expires_at' => $expiresAt,
                'reason' => $reason,
                'created_by' => $userId,
            ],
        );

        $this->clearTenantCache($tenantId);
        $this->auditLogService->log(
            $enabled ? 'feature.enabled' : 'feature.disabled',
            $tenantId,
            $userId,
            'entitlement_override',
            $override->id,
            ['feature_key' => $featureKey, 'enabled' => $enabled],
            $reason,
        );

        return $override;
    }

    public function setLimitOverride(
        string $tenantId,
        string $limitKey,
        ?int $value,
        bool $isUnlimited = false,
        bool $isPermanent = true,
        ?string $expiresAt = null,
        ?string $reason = null,
        ?string $userId = null,
    ): TenantEntitlementOverride {
        $override = TenantEntitlementOverride::updateOrCreate(
            [
                'tenant_id' => $tenantId,
                'override_type' => 'limit',
                'override_key' => $limitKey,
            ],
            [
                'value_int' => $value,
                'is_unlimited' => $isUnlimited,
                'is_permanent' => $isPermanent,
                'expires_at' => $expiresAt,
                'reason' => $reason,
                'created_by' => $userId,
            ],
        );

        $this->clearTenantCache($tenantId);
        $this->auditLogService->log(
            'limit.overridden',
            $tenantId,
            $userId,
            'entitlement_override',
            $override->id,
            ['limit_key' => $limitKey, 'value' => $value, 'is_unlimited' => $isUnlimited],
            $reason,
        );

        return $override;
    }

    public function resetToPlanDefaults(string $tenantId, ?string $userId = null, ?string $reason = null): void
    {
        DB::transaction(function () use ($tenantId, $userId, $reason) {
            TenantEntitlementOverride::where('tenant_id', $tenantId)->delete();
            $this->clearTenantCache($tenantId);
            $this->auditLogService->log(
                'entitlement.reset_to_plan',
                $tenantId,
                $userId,
                'tenant',
                $tenantId,
                [],
                $reason,
            );
        });
    }

    public function removeOverride(string $tenantId, string $overrideType, string $overrideKey, ?string $userId = null): void
    {
        TenantEntitlementOverride::where('tenant_id', $tenantId)
            ->where('override_type', $overrideType)
            ->where('override_key', $overrideKey)
            ->delete();

        $this->clearTenantCache($tenantId);
        $this->auditLogService->log(
            'entitlement.override_removed',
            $tenantId,
            $userId,
            'entitlement_override',
            null,
            ['override_type' => $overrideType, 'override_key' => $overrideKey],
        );
    }

    public function getActiveFeatureOverride(string $tenantId, string $featureKey): ?bool
    {
        $override = TenantEntitlementOverride::where('tenant_id', $tenantId)
            ->where('override_type', 'feature')
            ->where('override_key', $featureKey)
            ->active()
            ->first();

        return $override?->value_bool;
    }

    public function getActiveLimitOverride(string $tenantId, string $limitKey): ?TenantEntitlementOverride
    {
        return TenantEntitlementOverride::where('tenant_id', $tenantId)
            ->where('override_type', 'limit')
            ->where('override_key', $limitKey)
            ->active()
            ->first();
    }

    private function clearTenantCache(string $tenantId): void
    {
        Cache::forget("entitlements:legacy:{$tenantId}");
        Cache::forget("feature_flags:{$tenantId}");
        Cache::forget("entitlements:limits:{$tenantId}");
    }
}
