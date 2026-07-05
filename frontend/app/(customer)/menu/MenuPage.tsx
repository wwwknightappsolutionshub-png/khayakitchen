"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { MenuCard } from "@/components/customer/MenuCard";
import { MealCustomizeFlow } from "@/components/customer/MealCustomizeFlow";
import { PromoMealsSection } from "@/components/customer/PromoMealsSection";
import { RevenueRecoveryOffersSection } from "@/components/customer/RevenueRecoveryOffersSection";
import { SocialProof } from "@/components/customer/SocialProof";
import { useMenu } from "@/hooks/useMenu";
import { usePromoMeals } from "@/hooks/usePromoMeals";
import { useRevenueRecoveryOffers } from "@/hooks/useRevenueRecoveryOffers";
import type { Meal, PromoMealItem } from "@/lib/types";

function MenuCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)]">
      <div className="customer-shimmer aspect-video w-full" />
      <div className="space-y-2 p-4">
        <div className="customer-shimmer h-5 w-2/3 rounded" />
        <div className="customer-shimmer h-4 w-full rounded" />
        <div className="customer-shimmer h-5 w-16 rounded" />
      </div>
    </div>
  );
}

export default function MenuPage() {
  const searchParams = useSearchParams();
  const highlightId = searchParams.get("meal");
  const highlightCampaign = searchParams.get("campaign");
  const [customizingMeal, setCustomizingMeal] = useState<Meal | null>(null);
  const [customizingOffer, setCustomizingOffer] = useState<PromoMealItem | null>(null);
  const { data, isLoading, error } = useMenu();
  const { isPromo, promoEndsAt, promoItems, isClosed, isLoading: promoLoading, resolveMealForCustomize } =
    usePromoMeals();
  const {
    offers: recoveryOffers,
    isLoading: recoveryLoading,
    isClosed: recoveryClosed,
    resolveMealForCustomize: resolveRecoveryMeal,
    getPromoUnitPrice,
    getOfferForMeal,
    offerByMealId,
    trackCampaignOpen,
  } = useRevenueRecoveryOffers();

  useEffect(() => {
    if (highlightCampaign) {
      void trackCampaignOpen(highlightCampaign);
    }
  }, [highlightCampaign, trackCampaignOpen]);

  const meals = data?.meals ?? [];

  const recoveryOnlyOffers = recoveryOffers.filter(
    (offer) =>
      offer.campaign_id &&
      !promoItems.some((promo) => promo.meal_id === offer.meal_id && !offer.campaign_id),
  );

  const handlePromoSelect = (item: PromoMealItem) => {
    const meal = resolveMealForCustomize(item);
    if (meal) {
      setCustomizingOffer(item);
      setCustomizingMeal(meal);
    }
  };

  const handleRecoverySelect = (item: PromoMealItem) => {
    const meal = resolveRecoveryMeal(item);
    if (meal) {
      setCustomizingOffer(item);
      setCustomizingMeal(meal);
    }
  };

  return (
    <div className="customer-animate-in overflow-hidden px-4 pt-6">
      <header className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Menu</h1>
        <SocialProof className="mt-2" />
      </header>

      {recoveryOnlyOffers.length > 0 && (
        <div className="mb-6">
          <RevenueRecoveryOffersSection
            items={recoveryOnlyOffers}
            isLoading={recoveryLoading || isLoading}
            isClosed={recoveryClosed}
            onSelect={handleRecoverySelect}
          />
        </div>
      )}

      {isPromo && (
        <div className="mb-6">
          <PromoMealsSection
            promoEndsAt={promoEndsAt}
            items={promoItems}
            isLoading={promoLoading || isLoading}
            isClosed={isClosed}
            onSelect={handlePromoSelect}
          />
        </div>
      )}

      {isLoading && (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <MenuCardSkeleton key={i} />
          ))}
        </div>
      )}

      {error && (
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-6 py-10 text-center">
          <p className="text-[var(--muted)]">Could not load menu.</p>
          <p className="mt-1 text-sm text-[var(--muted)]">Check your connection and try again.</p>
        </div>
      )}

      <div className="space-y-4">
        {meals.map((meal, index) => (
          <MenuCard
            key={meal.id}
            meal={meal}
            onSelect={setCustomizingMeal}
            promoOffer={offerByMealId.get(meal.id) ?? null}
            highlighted={highlightId === meal.id || recoveryOffers.some((o) => o.meal_id === meal.id && o.campaign_id === highlightCampaign)}
            priority={index < 2}
          />
        ))}
      </div>

      {customizingMeal && (
        <MealCustomizeFlow
          meal={customizingMeal}
          promoUnitPrice={
            customizingOffer?.promo_price
              ? Number(customizingOffer.promo_price)
              : getPromoUnitPrice(customizingMeal.id)
          }
          campaignId={
            customizingOffer?.campaign_id ?? getOfferForMeal(customizingMeal.id)?.campaign_id ?? null
          }
          onClose={() => {
            setCustomizingMeal(null);
            setCustomizingOffer(null);
          }}
        />
      )}
    </div>
  );
}
