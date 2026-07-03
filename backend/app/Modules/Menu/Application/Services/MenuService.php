<?php

namespace App\Modules\Menu\Application\Services;

use App\Modules\Menu\Domain\Models\Meal;
use App\Modules\Menu\Domain\Models\MealOption;
use App\Modules\Menu\Domain\Models\OptionGroup;
use App\Modules\Menu\Infrastructure\Repositories\MealRepository;
use App\Modules\Pricing\Application\Services\PlanLimitService;
use App\Shared\Auth\PermissionService;
use App\Shared\Entitlements\FeatureAccessService;
use App\Shared\Tenancy\TenantContext;

class MenuService
{
    public function __construct(
        private MealRepository $mealRepository,
        private TenantContext $tenantContext,
        private PermissionService $permissionService,
        private PlanLimitService $planLimitService,
        private FeatureAccessService $featureAccessService,
    ) {}

    public function getMenu(): array
    {
        $meals = $this->mealRepository->getActiveWithOptions();

        return [
            'meals' => $meals->map(function (Meal $meal) {
                return [
                    'id' => $meal->id,
                    'name' => $meal->name,
                    'description' => $meal->description,
                    'image_url' => $meal->image_url,
                    'base_price' => $meal->base_price,
                    'options' => $meal->optionGroups->map(fn (OptionGroup $group) => [
                        'group' => $group->name,
                        'type' => $group->type,
                        'items' => $group->options->pluck('name')->all(),
                        'options' => $group->options->map(fn (MealOption $opt) => [
                            'id' => $opt->id,
                            'name' => $opt->name,
                            'price_delta' => $opt->price_delta,
                        ])->all(),
                    ])->all(),
                ];
            })->all(),
        ];
    }

    public function createMeal(array $data, array $permissions): Meal
    {
        $this->permissionService->authorize($permissions, 'menu.manage');
        $this->featureAccessService->assertAccess('menu_management');
        $this->planLimitService->assertMenuLimit();

        $userId = $this->tenantContext->user()?->id;

        return $this->mealRepository->create([
            'name' => $data['name'],
            'description' => $data['description'] ?? null,
            'image_url' => $data['image_url'] ?? null,
            'base_price' => $data['base_price'] ?? 0,
            'is_active' => $data['is_active'] ?? true,
            'created_by' => $userId,
            'updated_by' => $userId,
        ]);
    }

    public function updateMeal(string $id, array $data, array $permissions): Meal
    {
        $this->permissionService->authorize($permissions, 'menu.manage');

        $userId = $this->tenantContext->user()?->id;
        $data['updated_by'] = $userId;

        return $this->mealRepository->update($id, $data);
    }
}
