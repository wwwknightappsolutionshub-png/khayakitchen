"use client";

import { useState } from "react";
import Link from "next/link";
import { useCustomerHome } from "@/hooks/useCustomerHome";
import { HomeStatusHero } from "@/components/customer/HomeStatusHero";
import { FeaturedMealCard } from "@/components/customer/FeaturedMealCard";
import { PopularMealsRow } from "@/components/customer/PopularMealsRow";
import { PopularAddonsChips } from "@/components/customer/PopularAddonsChips";
import { MealCustomizeFlow } from "@/components/customer/MealCustomizeFlow";
import type { Meal } from "@/lib/types";
import type { AddonPopularity } from "@/lib/order-analytics";

export default function CustomerHomePage() {
  const {
    storefront,
    menu,
    analytics,
    featuredMeal,
    popularMeals,
    popularMealsMeta,
    addonPopularity,
    isClosed,
    hasLiveSalesData,
  } = useCustomerHome();

  const [customizingMeal, setCustomizingMeal] = useState<Meal | null>(null);
  const status = storefront.data?.status?.status ?? "open";
  const isLoading = storefront.isLoading || menu.isLoading || analytics.isLoading;

  const popularMealList = popularMeals;

  const handleAddonSelect = (addon: AddonPopularity) => {
    if (!addon.mealId) return;
    const meal = menu.data?.meals.find((m) => m.id === addon.mealId);
    if (meal) setCustomizingMeal(meal);
  };

  return (
    <div className="customer-animate-in space-y-8 px-4 pt-4 pb-4">
      <HomeStatusHero status={status} isLoading={storefront.isLoading} />

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Featured</h2>
          <Link href="/menu" className="text-sm text-[var(--primary)]">
            Full menu
          </Link>
        </div>
        <FeaturedMealCard
          meal={featuredMeal}
          isLoading={isLoading}
          isClosed={isClosed}
          showLiveBadge={hasLiveSalesData}
          onOrder={setCustomizingMeal}
        />
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold">Popular today</h2>
        <PopularMealsRow
          meals={popularMealList}
          meta={popularMealsMeta}
          isLoading={menu.isLoading || analytics.isLoading}
          isClosed={isClosed}
          hasLiveSalesData={hasLiveSalesData}
          onSelect={setCustomizingMeal}
        />
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold">Popular add-ons</h2>
        <PopularAddonsChips
          addons={addonPopularity}
          isLoading={menu.isLoading || analytics.isLoading}
          isClosed={isClosed}
          onSelect={handleAddonSelect}
        />
      </section>

      {customizingMeal && (
        <MealCustomizeFlow meal={customizingMeal} onClose={() => setCustomizingMeal(null)} />
      )}
    </div>
  );
}
