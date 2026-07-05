"use client";

import type { Meal, PromoMealItem } from "@/lib/types";
import { MealImage } from "@/components/customer/MealImage";
import { MealBadge } from "@/components/customer/MealBadge";
import { getMealBadges, getPairingSuggestion } from "@/lib/menu-meta";
import { formatCurrency, cn, toNumber } from "@/lib/utils";

interface MenuCardProps {
  meal: Meal;
  onSelect: (meal: Meal) => void;
  highlighted?: boolean;
  priority?: boolean;
  promoOffer?: PromoMealItem | null;
}

export function MenuCard({ meal, onSelect, highlighted, priority, promoOffer }: MenuCardProps) {
  const badges = getMealBadges(meal);
  const pairing = getPairingSuggestion(meal.name);
  const basePrice = toNumber(meal.base_price);
  const promoPrice = promoOffer ? toNumber(promoOffer.promo_price) : null;
  const hasDiscount = promoPrice !== null && promoPrice < basePrice;
  const discountPercent =
    promoOffer?.discount_percent ??
    (hasDiscount ? Math.round((1 - promoPrice / basePrice) * 100) : null);

  return (
    <button
      type="button"
      onClick={() => onSelect(meal)}
      className={cn(
        "customer-press group w-full overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] text-left",
        "shadow-[0_2px_12px_rgba(0,0,0,0.2)] transition-[transform,box-shadow,border-color] duration-200",
        "hover:border-[var(--primary)]/25 hover:shadow-[0_8px_24px_rgba(0,0,0,0.35)]",
        highlighted && "border-[var(--primary)]/50",
        hasDiscount && "border-emerald-500/30",
      )}
    >
      <div className="relative aspect-video w-full overflow-hidden">
        <MealImage
          name={meal.name}
          imageUrl={meal.image_url}
          className="h-full w-full rounded-none"
          sizes="(max-width: 512px) 100vw, 512px"
          priority={priority}
        />
        {hasDiscount && discountPercent && (
          <span className="absolute right-3 top-3 rounded-full bg-emerald-600 px-2.5 py-1 text-xs font-bold text-white shadow-lg">
            −{discountPercent}%
          </span>
        )}
      </div>

      <div className="relative p-4">
        {badges.length > 0 && (
          <div className="mb-2.5 flex flex-wrap gap-1.5">
            {badges.map((badge) => (
              <MealBadge key={badge} type={badge} />
            ))}
          </div>
        )}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h3 className="text-base font-semibold leading-tight">{meal.name}</h3>
            {meal.description && (
              <p className="mt-1 line-clamp-2 text-sm text-[var(--muted)]">{meal.description}</p>
            )}
            {pairing && (
              <p className="mt-2 text-xs text-[var(--secondary)]">{pairing}</p>
            )}
          </div>
          <div className="shrink-0 text-right">
            {hasDiscount ? (
              <>
                <p className="price text-base text-emerald-400">{formatCurrency(promoPrice)}</p>
                <p className="price text-xs text-[var(--muted)] line-through">{formatCurrency(basePrice)}</p>
              </>
            ) : (
              <p className="price text-base text-[var(--primary)]">{formatCurrency(basePrice)}</p>
            )}
          </div>
        </div>
      </div>
    </button>
  );
}
