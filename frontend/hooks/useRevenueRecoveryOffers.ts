"use client";

import { useMemo } from "react";
import { useStorefront } from "@/hooks/useStorefront";
import { useMenu } from "@/hooks/useMenu";
import { revenueRecoveryService } from "@/services/revenue-recovery.service";
import type { Meal, PromoMealItem } from "@/lib/types";

export function useRevenueRecoveryOffers() {
  const storefront = useStorefront();
  const menu = useMenu();

  const offers = storefront.data?.revenue_recovery?.offers ?? [];
  const isClosed = storefront.data?.status?.is_accepting_orders === false;

  const resolveMealForCustomize = (item: PromoMealItem): Meal | null => {
    const meal = menu.data?.meals?.find((m) => m.id === item.meal_id);
    if (!meal) return null;
    return meal;
  };

  const getPromoUnitPrice = (mealId: string): number | undefined => {
    const offer = offers.find((o) => o.meal_id === mealId);
    if (!offer?.promo_price) return undefined;
    return Number(offer.promo_price);
  };

  const getOfferForMeal = (mealId: string): PromoMealItem | undefined => offers.find((o) => o.meal_id === mealId);

  const offerByMealId = useMemo(() => {
    const map = new Map<string, PromoMealItem>();
    for (const offer of offers) {
      map.set(offer.meal_id, offer);
    }
    return map;
  }, [offers]);

  const trackCampaignOpen = async (campaignId: string) => {
    const key = `khayaos-rr-open-${campaignId}`;
    if (typeof sessionStorage !== "undefined" && sessionStorage.getItem(key)) {
      return;
    }
    try {
      await revenueRecoveryService.trackCampaignOpen(campaignId);
      sessionStorage.setItem(key, "1");
    } catch {
      // non-blocking analytics
    }
  };

  return {
    offers,
    offerByMealId,
    isLoading: storefront.isLoading,
    isClosed,
    resolveMealForCustomize,
    getPromoUnitPrice,
    getOfferForMeal,
    trackCampaignOpen,
  };
}
