"use client";

import { useState } from "react";
import Link from "next/link";
import { useCustomerHome } from "@/hooks/useCustomerHome";
import { FeaturedMealCard } from "@/components/customer/FeaturedMealCard";
import { PopularMealsRow } from "@/components/customer/PopularMealsRow";
import { PromoMealsSection } from "@/components/customer/PromoMealsSection";
import { PopularAddonsChips } from "@/components/customer/PopularAddonsChips";
import { MealCustomizeFlow } from "@/components/customer/MealCustomizeFlow";
import { usePromoMeals } from "@/hooks/usePromoMeals";
import type { Meal } from "@/lib/types";
import type { AddonPopularity } from "@/lib/order-analytics";
import type { PromoMealItem } from "@/lib/types";

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
  const { isPromo, promoEndsAt, promoItems, isClosed: promoClosed, isLoading: promoLoading, resolveMealForCustomize } =
    usePromoMeals();

  const [customizingMeal, setCustomizingMeal] = useState<Meal | null>(null);
  const isLoading = storefront.isLoading || menu.isLoading || analytics.isLoading;

  const handlePromoSelect = (item: PromoMealItem) => {
    const meal = resolveMealForCustomize(item);
    if (meal) setCustomizingMeal(meal);
  };

  const handleAddonSelect = (addon: AddonPopularity) => {
    if (!addon.mealId) return;
    const meal = menu.data?.meals.find((m) => m.id === addon.mealId);
    if (meal) setCustomizingMeal(meal);
  };

  return (
    <div className="customer-animate-in space-y-8 px-4 pt-4 pb-4">
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="featured-section-title text-lg font-bold tracking-tight">Our Featured Meal</h2>
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

      {isPromo && (
        <PromoMealsSection
          promoEndsAt={promoEndsAt}
          items={promoItems}
          isLoading={promoLoading || menu.isLoading}
          isClosed={promoClosed}
          onSelect={handlePromoSelect}
        />
      )}

      <section className="overflow-hidden">
        <h2 className="mb-3 text-lg font-semibold tracking-tight">Popular today</h2>
        <PopularMealsRow
          meals={popularMeals}
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
