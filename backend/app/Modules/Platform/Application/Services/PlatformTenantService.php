<?php

namespace App\Modules\Platform\Application\Services;

use App\Modules\Auth\Domain\Models\Tenant;

class PlatformTenantService
{
    public function listTenants(): array
    {
        return Tenant::query()
            ->orderBy('name')
            ->get()
            ->map(fn (Tenant $tenant) => [
                'id' => $tenant->id,
                'name' => $tenant->name,
                'slug' => $tenant->slug,
                'status' => $tenant->status,
                'created_at' => $tenant->created_at?->toIso8601String(),
            ])
            ->values()
            ->all();
    }
}
