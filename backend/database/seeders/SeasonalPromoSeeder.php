<?php

namespace Database\Seeders;

use App\Modules\Auth\Domain\Models\Tenant;
use App\Modules\Menu\Domain\Models\Meal;
use App\Modules\SeasonalPromo\Domain\Models\SeasonalPromo;
use App\Modules\TenantBranding\Domain\Models\TenantBranding;
use Illuminate\Database\Seeder;

class SeasonalPromoSeeder extends Seeder
{
    public function run(): void
    {
        $tenantIds = $this->resolveTargetTenantIds();

        foreach ($tenantIds as $tenantId) {
            $meal = Meal::withoutGlobalScopes()
                ->where('tenant_id', $tenantId)
                ->where('is_active', true)
                ->orderBy('name')
                ->first();

            if (! $meal) {
                $this->command?->warn("SeasonalPromoSeeder: skipped tenant {$tenantId} (no active meals).");

                continue;
            }

            $brand = TenantBranding::withoutGlobalScopes()
                ->where('tenant_id', $tenantId)
                ->value('restaurant_name');
            $tenantName = Tenant::withoutGlobalScopes()->where('id', $tenantId)->value('name');
            $kitchen = $brand ?: $tenantName ?: 'your kitchen';

            SeasonalPromo::withoutGlobalScopes()->updateOrCreate(
                ['tenant_id' => $tenantId],
                [
                    'image_url' => $meal->image_url,
                    'headline' => 'This month at '.$kitchen,
                    'subheadline' => 'A limited seasonal plate worth coming back for',
                    'details' => 'Try '.$meal->name.' while this seasonal splash is live. Tap below to jump straight to it on the menu.',
                    'cta_label' => 'See '.$meal->name,
                    'meal_id' => $meal->id,
                    'is_published' => true,
                ],
            );

            $this->command?->info("SeasonalPromoSeeder: seeded sample promo for {$kitchen}.");
        }
    }

    /**
     * Pilot Owner (slug pilot / Khaya Kitchen branding) and Jacob's Kitchen when present.
     *
     * @return list<string>
     */
    private function resolveTargetTenantIds(): array
    {
        $ids = [];

        foreach (Tenant::withoutGlobalScopes()->get(['id', 'slug', 'name']) as $tenant) {
            $slug = strtolower((string) $tenant->slug);
            $name = strtolower((string) $tenant->name);
            if (
                $slug === 'pilot'
                || str_contains($slug, 'jacob')
                || str_contains($name, 'jacob')
                || str_contains($name, 'pilot')
            ) {
                $ids[] = (string) $tenant->id;
            }
        }

        foreach (TenantBranding::withoutGlobalScopes()->get(['tenant_id', 'restaurant_name']) as $branding) {
            $restaurant = strtolower((string) $branding->restaurant_name);
            if (
                str_contains($restaurant, 'jacob')
                || str_contains($restaurant, 'khaya kitchen')
            ) {
                $ids[] = (string) $branding->tenant_id;
            }
        }

        return array_values(array_unique($ids));
    }
}
