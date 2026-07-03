<?php

namespace App\Modules\Platform\Application\Services;

use App\Modules\Auth\Domain\Models\FeatureFlag;
use App\Modules\Auth\Domain\Models\Tenant;
use Illuminate\Support\Facades\Cache;

class PlatformFeatureFlagService
{
    public function allTenantsWithFlags(): array
    {
        $tenants = Tenant::query()->orderBy('name')->get();

        return $tenants->map(function (Tenant $tenant) {
            $flags = FeatureFlag::withoutGlobalScopes()
                ->where('tenant_id', $tenant->id)
                ->orderBy('module')
                ->get()
                ->mapWithKeys(fn (FeatureFlag $flag) => [$flag->module => $flag->enabled])
                ->toArray();

            return [
                'tenant_id' => $tenant->id,
                'tenant_name' => $tenant->name,
                'tenant_slug' => $tenant->slug,
                'tenant_status' => $tenant->status,
                'flags' => $flags,
            ];
        })->values()->all();
    }

    public function updateTenantFlags(string $tenantId, array $flags): array
    {
        $tenant = Tenant::query()->findOrFail($tenantId);

        foreach ($flags as $module => $enabled) {
            FeatureFlag::withoutGlobalScopes()->updateOrCreate(
                ['tenant_id' => $tenant->id, 'module' => $module],
                ['enabled' => (bool) $enabled],
            );
        }

        Cache::forget("feature_flags:{$tenant->id}");

        return FeatureFlag::withoutGlobalScopes()
            ->where('tenant_id', $tenant->id)
            ->get()
            ->mapWithKeys(fn (FeatureFlag $flag) => [$flag->module => $flag->enabled])
            ->toArray();
    }
}
