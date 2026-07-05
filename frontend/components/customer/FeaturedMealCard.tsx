"use client";

import type { Meal, PromoMealItem } from "@/lib/types";
import { MealImage } from "@/components/customer/MealImage";
import { CustomerButton } from "@/components/customer/CustomerButton";
import { formatCurrency, toNumber } from "@/lib/utils";

interface FeaturedMealCardProps {
  meal?: Meal;
  promoOffer?: PromoMealItem | null;
  isLoading?: boolean;
  isClosed?: boolean;
  showLiveBadge?: boolean;
  onOrder: (meal: Meal) => void;
}

export function FeaturedMealCard({
  meal,
  promoOffer,
  isLoading,
  isClosed,
  showLiveBadge,
  onOrder,
}: FeaturedMealCardProps) {
  if (isLoading || !meal) {
    return (
      <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)]">
        <div className="customer-shimmer aspect-[16/10] w-full" />
        <div className="space-y-2 p-4">
          <div className="customer-shimmer h-6 w-2/3 rounded" />
          <div className="customer-shimmer h-8 w-24 rounded" />
        </div>
      </div>
    );
  }

  const basePrice = toNumber(meal.base_price);
  const promoPrice = promoOffer ? toNumber(promoOffer.promo_price) : null;
  const hasDiscount = promoPrice !== null && promoPrice < basePrice;
  const discountPercent =
    promoOffer?.discount_percent ??
    (hasDiscount ? Math.round((1 - promoPrice / basePrice) * 100) : null);

  return (
    <article className="overflow-hidden rounded-2xl border border-[var(--primary)]/35 bg-[var(--surface)] shadow-[0_8px_32px_rgba(0,0,0,0.35)]">
      <div className="relative aspect-[16/10] w-full">
        <MealImage
          name={meal.name}
          imageUrl={meal.image_url}
          className="h-full w-full rounded-none"
          sizes="(max-width: 512px) 100vw, 512px"
          priority
        />
        {showLiveBadge && (
          <span className="absolute left-3 top-3 rounded-full bg-[var(--primary)] px-3 py-1 text-xs font-semibold text-white">
            Most ordered today
          </span>
        )}
        {hasDiscount && discountPercent && (
          <span className="absolute right-3 top-3 rounded-full bg-emerald-600 px-3 py-1 text-xs font-bold text-white">
            −{discountPercent}% off
          </span>
        )}
      </div>
      <div className="flex items-end justify-between gap-4 p-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight">{meal.name}</h2>
          {hasDiscount ? (
            <div className="mt-1 flex items-baseline gap-2">
              <p className="price text-2xl text-emerald-400">{formatCurrency(promoPrice)}</p>
              <p className="price text-sm text-[var(--muted)] line-through">{formatCurrency(basePrice)}</p>
            </div>
          ) : (
            <p className="price mt-1 text-2xl text-[var(--primary)]">{formatCurrency(basePrice)}</p>
          )}
        </div>
        <CustomerButton
          size="lg"
          className="featured-order-btn shrink-0"
          disabled={isClosed}
          onClick={() => onOrder(meal)}
        >
          {isClosed ? "Closed" : hasDiscount ? "Order deal" : "Order now"}
        </CustomerButton>
      </div>
    </article>
  );
}
