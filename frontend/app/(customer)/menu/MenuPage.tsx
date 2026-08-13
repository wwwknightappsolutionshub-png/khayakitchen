"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { MenuCard } from "@/components/customer/MenuCard";
import { MealCustomizeFlow } from "@/components/customer/MealCustomizeFlow";
import { PromoMealsSection } from "@/components/customer/PromoMealsSection";
import { RevenueRecoveryOffersSection } from "@/components/customer/RevenueRecoveryOffersSection";
import { SocialProof } from "@/components/customer/SocialProof";
import { MealReferModal } from "@/components/customer/MealReferModal";
import { ReviewTicker } from "@/components/customer/ReviewTicker";
import { KitchenReviewForm } from "@/components/customer/KitchenReviewForm";
import { VoiceOrderAssistant } from "@/components/customer/VoiceOrderAssistant";
import { useMenu } from "@/hooks/useMenu";
import { usePromoMeals } from "@/hooks/usePromoMeals";
import { useRevenueRecoveryOffers } from "@/hooks/useRevenueRecoveryOffers";
import { useStorefront } from "@/hooks/useStorefront";
import { engagementService } from "@/services/engagement.service";
import type { Meal, MealReferPayload, PromoMealItem } from "@/lib/types";
import { toNumber } from "@/lib/utils";
import type { VoiceCartPricing } from "@/lib/voice-order";

const PHONE_STORAGE_KEY = "khayaos-customer-phone";
const GUEST_KEY_STORAGE = "khayaos-guest-key";

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

function getOrCreateGuestKey(): string {
  if (typeof window === "undefined") return "ssr-guest";
  const existing = localStorage.getItem(GUEST_KEY_STORAGE);
  if (existing) return existing;
  const key =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `guest-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  localStorage.setItem(GUEST_KEY_STORAGE, key);
  return key;
}

export default function MenuPage() {
  const searchParams = useSearchParams();
  const highlightId = searchParams.get("meal");

  useEffect(() => {
    const ref = searchParams.get("ref");
    if (ref) {
      localStorage.setItem("khayaos-referral-token", ref);
    }
  }, [searchParams]);

  useEffect(() => {
    if (searchParams.get("review") !== "1") return;
    const timer = window.setTimeout(() => {
      document.getElementById("kitchen-review")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 500);
    return () => window.clearTimeout(timer);
  }, [searchParams]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const hash = window.location.hash.replace(/^#/, "");
    if (!hash.startsWith("meal-")) return;
    const timer = window.setTimeout(() => {
      document.getElementById(hash)?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 400);
    return () => window.clearTimeout(timer);
  }, [highlightId]);
  const highlightCampaign = searchParams.get("campaign");
  const queryClient = useQueryClient();
  const [customizingMeal, setCustomizingMeal] = useState<Meal | null>(null);
  const [customizingOffer, setCustomizingOffer] = useState<PromoMealItem | null>(null);
  const [likedByMeal, setLikedByMeal] = useState<Record<string, boolean>>({});
  const [likeCounts, setLikeCounts] = useState<Record<string, number>>({});
  const [referPayload, setReferPayload] = useState<MealReferPayload | null>(null);
  const [referOpen, setReferOpen] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const { data, isLoading, error } = useMenu();
  const storefront = useStorefront();
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

  useEffect(() => {
    if (!data?.meals) return;
    const counts: Record<string, number> = {};
    for (const meal of data.meals) {
      if (typeof meal.likes_count === "number") {
        counts[meal.id] = meal.likes_count;
      }
    }
    setLikeCounts(counts);
  }, [data?.meals]);

  const meals = data?.meals ?? [];
  const likesEnabled = data?.menu_likes_refer_enabled === true;
  const reviewTicker = storefront.data?.review_ticker ?? [];

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

  const recoveryOnlyOffers = recoveryOffers.filter(
    (offer) =>
      offer.campaign_id &&
      !promoItems.some((promo) => promo.meal_id === offer.meal_id && !offer.campaign_id),
  );

  const likeMutation = useMutation({
    mutationFn: (meal: Meal) => {
      const phone = localStorage.getItem(PHONE_STORAGE_KEY)?.trim() || undefined;
      const guest_key = phone ? undefined : getOrCreateGuestKey();
      return engagementService.toggleMealLike(meal.id, { phone, guest_key });
    },
    onSuccess: (res) => {
      setLikedByMeal((prev) => ({ ...prev, [res.meal_id]: res.liked }));
      setLikeCounts((prev) => ({ ...prev, [res.meal_id]: res.likes_count }));
      setActionError(null);
      queryClient.invalidateQueries({ queryKey: ["menu"] });
    },
    onError: (err: Error) => setActionError(err.message),
  });

  const referMutation = useMutation({
    mutationFn: (meal: Meal) => {
      const phone =
        typeof window !== "undefined"
          ? localStorage.getItem("khayaos-customer-phone") ?? undefined
          : undefined;
      return engagementService.getMealRefer(meal.id, phone);
    },
    onSuccess: (res) => {
      setReferPayload(res.refer);
      setReferOpen(true);
      setActionError(null);
    },
    onError: (err: Error) => setActionError(err.message),
  });

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

      {actionError && (
        <p className="mb-4 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-300">
          {actionError}
        </p>
      )}

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
            highlighted={
              highlightId === meal.id ||
              recoveryOffers.some(
                (o) => o.meal_id === meal.id && o.campaign_id === highlightCampaign,
              )
            }
            priority={index < 2}
            likesEnabled={likesEnabled || meal.likes_enabled === true}
            likesCount={likeCounts[meal.id] ?? meal.likes_count ?? 0}
            liked={likedByMeal[meal.id] === true}
            onLike={(m) => likeMutation.mutate(m)}
            onRefer={(m) => referMutation.mutate(m)}
            likePending={likeMutation.isPending && likeMutation.variables?.id === meal.id}
            referPending={referMutation.isPending && referMutation.variables?.id === meal.id}
          />
        ))}
      </div>

      <KitchenReviewForm />

      <div className="mt-8 pb-4">
        <ReviewTicker items={reviewTicker} />
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

      <MealReferModal
        open={referOpen}
        refer={referPayload}
        onClose={() => {
          setReferOpen(false);
          setReferPayload(null);
        }}
      />

      <VoiceOrderAssistant
        meals={meals}
        kitchenName={storefront.data?.branding?.restaurant_name}
        isAcceptingOrders={storefront.data?.status?.is_accepting_orders !== false}
        getCartPricing={getVoiceCartPricing}
      />
    </div>
  );
}
