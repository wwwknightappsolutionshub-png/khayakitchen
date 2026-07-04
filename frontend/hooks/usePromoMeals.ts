"use client";

import { useStorefront } from "@/hooks/useStorefront";
import { useMenu } from "@/hooks/useMenu";
import type { Meal, PromoMealItem } from "@/lib/types";

export function usePromoMeals() {
  const storefront = useStorefront();
  const menu = useMenu();

  const status = storefront.data?.status?.status ?? "open";
  const isPromo = status === "promo_mode";
  const promoEndsAt = storefront.data?.status?.promo_ends_at ?? null;
  const promoItems = storefront.data?.status?.promo_meals ?? [];
  const isClosed = storefront.data?.status?.is_accepting_orders === false;

  const mealById = new Map((menu.data?.meals ?? []).map((m) => [m.id, m]));

  const resolveMealForCustomize = (item: PromoMealItem): Meal | undefined => {
    return mealById.get(item.meal_id);
  };

  return {
    isPromo,
    promoEndsAt,
    promoItems,
    isClosed,
    isLoading: storefront.isLoading,
    resolveMealForCustomize,
  };
}
