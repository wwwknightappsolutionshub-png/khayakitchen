"use client";

import { useState } from "react";
import { CustomerRouteLink } from "@/components/customer/CustomerRouteLink";
import { useCustomerHome } from "@/hooks/useCustomerHome";
import { FeaturedMealCard } from "@/components/customer/FeaturedMealCard";
import { PopularMealsRow } from "@/components/customer/PopularMealsRow";
import { PromoMealsSection } from "@/components/customer/PromoMealsSection";
import { RevenueRecoveryOffersSection } from "@/components/customer/RevenueRecoveryOffersSection";
import { PopularAddonsChips } from "@/components/customer/PopularAddonsChips";
import { MealCustomizeFlow } from "@/components/customer/MealCustomizeFlow";
import { VoiceOrderAssistant } from "@/components/customer/VoiceOrderAssistant";
import { usePromoMeals } from "@/hooks/usePromoMeals";
import { useRevenueRecoveryOffers } from "@/hooks/useRevenueRecoveryOffers";
import type { Meal } from "@/lib/types";
import type { AddonPopularity } from "@/lib/order-analytics";
import type { PromoMealItem } from "@/lib/types";
import { toNumber } from "@/lib/utils";
import type { VoiceCartPricing } from "@/lib/voice-order";

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
  const {
    offers: recoveryOffers,
    isLoading: recoveryLoading,
    isClosed: recoveryClosed,
    resolveMealForCustomize: resolveRecoveryMeal,
    getPromoUnitPrice,
    getOfferForMeal,
  } = useRevenueRecoveryOffers();

  const [customizingMeal, setCustomizingMeal] = useState<Meal | null>(null);
  const [customizingOffer, setCustomizingOffer] = useState<PromoMealItem | null>(null);
  const isLoading = storefront.isLoading || menu.isLoading || analytics.isLoading;

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

  const handleAddonSelect = (addon: AddonPopularity) => {
    if (!addon.mealId) return;
    const meal = menu.data?.meals.find((m) => m.id === addon.mealId);
    if (meal) setCustomizingMeal(meal);
  };

  const resolveOfferForMeal = (mealId: string): PromoMealItem | undefined =>
    getOfferForMeal(mealId) ?? promoItems.find((p) => p.meal_id === mealId);

  const getVoiceCartPricing = (meal: Meal): VoiceCartPricing => {
    const list = toNumber(meal.base_price);
    const offer = resolveOfferForMeal(meal.id);
    const promo =
      offer?.promo_price != null ? Number(offer.promo_price) : getPromoUnitPrice(meal.id);
    if (promo != null && !Number.isNaN(promo) && promo < list) {
      return {
        basePrice: promo,
        originalBasePrice: list,
        campaignId: offer?.campaign_id ?? null,
      };
    }
    return { basePrice: list, campaignId: offer?.campaign_id ?? null };
  };

  return (
    <div className="customer-animate-in space-y-8 px-4 pt-4 pb-4">
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="featured-section-title text-lg font-bold tracking-tight">Our Featured Meal</h2>
          <CustomerRouteLink href="/menu" className="text-sm text-[var(--primary)]">
            Full menu
          </CustomerRouteLink>
        </div>
        <FeaturedMealCard
          meal={featuredMeal}
          promoOffer={featuredMeal ? getOfferForMeal(featuredMeal.id) ?? null : null}
          isLoading={isLoading}
          isClosed={isClosed}
          showLiveBadge={hasLiveSalesData}
          onOrder={setCustomizingMeal}
        />
      </section>

      {recoveryOnlyOffers.length > 0 && (
        <RevenueRecoveryOffersSection
          items={recoveryOnlyOffers}
          isLoading={recoveryLoading || menu.isLoading}
          isClosed={recoveryClosed}
          onSelect={handleRecoverySelect}
        />
      )}

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

      <VoiceOrderAssistant
        meals={menu.data?.meals ?? []}
        kitchenName={storefront.data?.branding?.restaurant_name}
        isAcceptingOrders={!isClosed}
        getCartPricing={getVoiceCartPricing}
        onCustomizeMeal={(meal) => {
          setCustomizingOffer(resolveOfferForMeal(meal.id) ?? null);
          setCustomizingMeal(meal);
        }}
      />
    </div>
  );
}
