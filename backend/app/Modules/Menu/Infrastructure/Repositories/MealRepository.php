<?php

namespace App\Modules\Menu\Infrastructure\Repositories;

use App\Modules\Menu\Domain\Models\Meal;
use App\Shared\Database\BaseRepository;

class MealRepository extends BaseRepository
{
    public function __construct(Meal $model, \App\Shared\Tenancy\TenantContext $tenantContext)
    {
        parent::__construct($model, $tenantContext);
    }

    public function getActiveWithOptions()
    {
        return $this->query()
            ->where('is_active', true)
            ->with(['optionGroups.options' => fn ($q) => $q->where('is_active', true)])
            ->get();
    }
}
