<?php

namespace App\Modules\Platform\Application\Services;

use App\Modules\Platform\Infrastructure\Repositories\PlatformModuleRepository;

class ModuleRegistryService
{
    public function __construct(private PlatformModuleRepository $repository) {}

    public function all(): array
    {
        return $this->repository->all()
            ->map(fn ($module) => [
                'id' => $module->id,
                'key' => $module->key,
                'name' => $module->name,
                'status' => $module->status,
                'enabled' => $module->enabled,
                'description' => $module->description,
                'sort_order' => $module->sort_order,
            ])
            ->values()
            ->all();
    }
}
