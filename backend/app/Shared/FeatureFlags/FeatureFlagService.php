<?php

namespace App\Shared\FeatureFlags;

use App\Shared\Entitlements\FeatureAccessService;
use App\Shared\Tenancy\TenantContext;
use Illuminate\Support\Facades\Cache;

class FeatureFlagService
{
    public function __construct(
        private TenantContext $tenantContext,
        private FeatureAccessService $featureAccessService,
    ) {}

    public function isEnabled(string $module): bool
    {
        return $this->featureAccessService->canAccessModule(
            $module,
            $this->tenantContext->id(),
            $this->tenantContext->user(),
        );
    }

    public function all(): array
    {
        return $this->featureAccessService->legacyFlagsForTenant($this->tenantContext->id());
    }

    public function updateFlags(array $flags): void
    {
        $tenantId = $this->tenantContext->id();
        foreach ($flags as $module => $enabled) {
            \App\Modules\Auth\Domain\Models\FeatureFlag::withoutGlobalScopes()->updateOrCreate(
                ['tenant_id' => $tenantId, 'module' => $module],
                ['enabled' => (bool) $enabled],
            );
        }
        $this->featureAccessService->clearCache($tenantId);
        Cache::forget("feature_flags:{$tenantId}");
    }

    public function clearCache(?string $tenantId = null): void
    {
        $tenantId = $tenantId ?? $this->tenantContext->id();
        $this->featureAccessService->clearCache($tenantId);
        Cache::forget('feature_flags:'.$tenantId);
    }
}
