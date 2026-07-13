<?php

namespace App\Modules\Menu\Application\Services;

use App\Modules\Engagement\Application\Services\MealLikeService;
use App\Modules\Menu\Domain\Models\Meal;
use App\Modules\Menu\Domain\Models\MealOption;
use App\Modules\Menu\Domain\Models\OptionGroup;
use App\Modules\Menu\Infrastructure\Repositories\MealRepository;
use App\Modules\Pricing\Application\Services\PlanLimitService;
use App\Shared\Auth\PermissionService;
use App\Shared\Entitlements\FeatureAccessService;
use App\Shared\Tenancy\TenantContext;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

class MenuService
{
    public function __construct(
        private MealRepository $mealRepository,
        private TenantContext $tenantContext,
        private PermissionService $permissionService,
        private PlanLimitService $planLimitService,
        private FeatureAccessService $featureAccessService,
        private MealLikeService $mealLikeService,
    ) {}

    public function getMenu(): array
    {
        $meals = $this->mealRepository->getActiveWithOptions();
        $likeCounts = [];
        $likesEnabled = $this->featureAccessService->canAccess(MealLikeService::FEATURE_KEY);

        if ($likesEnabled) {
            $likeCounts = $this->mealLikeService->likeCountsForMeals($meals->pluck('id')->all());
        }

        return [
            'meals' => $meals->map(function (Meal $meal) use ($likeCounts, $likesEnabled) {
                return [
                    'id' => $meal->id,
                    'name' => $meal->name,
                    'description' => $meal->description,
                    'image_url' => $meal->image_url,
                    'base_price' => $meal->base_price,
                    'likes_count' => $likesEnabled ? ($likeCounts[$meal->id] ?? 0) : null,
                    'likes_enabled' => $likesEnabled,
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
            'menu_likes_refer_enabled' => $likesEnabled,
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

    public function deleteMeal(string $id, array $permissions): void
    {
        $this->permissionService->authorize($permissions, 'menu.manage');

        $meal = Meal::findOrFail($id);
        $meal->delete();
    }

    public function listMealsAdmin(array $permissions): array
    {
        $this->permissionService->authorize($permissions, 'menu.manage');

        $meals = Meal::with(['optionGroups.options'])->orderBy('name')->get();

        return ['meals' => $meals];
    }

    public function createOptionGroup(array $data, array $permissions): OptionGroup
    {
        $this->permissionService->authorize($permissions, 'menu.manage');
        $this->planLimitService->assertCategoryLimit();

        return OptionGroup::create([
            'tenant_id' => $this->tenantContext->id(),
            'meal_id' => $data['meal_id'],
            'name' => $data['name'],
            'type' => $data['type'] ?? 'single',
        ]);
    }

    public function updateOptionGroup(string $id, array $data, array $permissions): OptionGroup
    {
        $this->permissionService->authorize($permissions, 'menu.manage');

        $group = OptionGroup::findOrFail($id);
        $group->update(array_filter([
            'name' => $data['name'] ?? null,
            'type' => $data['type'] ?? null,
        ], fn ($v) => $v !== null));

        return $group->fresh('options');
    }

    public function deleteOptionGroup(string $id, array $permissions): void
    {
        $this->permissionService->authorize($permissions, 'menu.manage');

        $group = OptionGroup::findOrFail($id);
        MealOption::where('option_group_id', $group->id)->delete();
        $group->delete();
    }

    public function createMealOption(array $data, array $permissions): MealOption
    {
        $this->permissionService->authorize($permissions, 'menu.manage');

        return MealOption::create([
            'tenant_id' => $this->tenantContext->id(),
            'option_group_id' => $data['option_group_id'],
            'name' => $data['name'],
            'price_delta' => $data['price_delta'] ?? 0,
            'is_active' => $data['is_active'] ?? true,
            'inventory_impact' => $data['inventory_impact'] ?? null,
        ]);
    }

    public function updateMealOption(string $id, array $data, array $permissions): MealOption
    {
        $this->permissionService->authorize($permissions, 'menu.manage');

        $option = MealOption::findOrFail($id);
        $option->update(array_filter([
            'name' => $data['name'] ?? null,
            'price_delta' => $data['price_delta'] ?? null,
            'is_active' => $data['is_active'] ?? null,
            'inventory_impact' => $data['inventory_impact'] ?? null,
        ], fn ($v) => $v !== null));

        return $option->fresh();
    }

    public function deleteMealOption(string $id, array $permissions): void
    {
        $this->permissionService->authorize($permissions, 'menu.manage');

        MealOption::findOrFail($id)->delete();
    }

    public function uploadMealImage(string $id, UploadedFile $file, array $permissions): Meal
    {
        $this->permissionService->authorize($permissions, 'menu.manage');
        $this->planLimitService->assertImageLimit();

        $path = $file->store('meals', 'public');
        $url = Storage::disk('public')->url($path);

        return $this->updateMeal($id, ['image_url' => $url], $permissions);
    }
}
