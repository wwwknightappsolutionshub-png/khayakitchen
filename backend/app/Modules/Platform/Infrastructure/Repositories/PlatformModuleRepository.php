<?php

namespace App\Modules\Platform\Infrastructure\Repositories;

use App\Modules\Platform\Domain\Models\PlatformModule;
use Illuminate\Support\Collection;

class PlatformModuleRepository
{
    public function all(): Collection
    {
        return PlatformModule::query()
            ->orderBy('sort_order')
            ->orderBy('name')
            ->get();
    }

    public function findByKey(string $key): ?PlatformModule
    {
        return PlatformModule::query()->where('key', $key)->first();
    }
}
