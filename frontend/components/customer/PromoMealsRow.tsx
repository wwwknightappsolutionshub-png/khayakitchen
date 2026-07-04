"use client";

import type { PromoMealItem } from "@/lib/types";
import { MealImage } from "@/components/customer/MealImage";
import { formatCurrency, cn, toNumber } from "@/lib/utils";

interface PromoMealsRowProps {
  items: PromoMealItem[];
  isLoading?: boolean;
  isClosed?: boolean;
  onSelect: (item: PromoMealItem) => void;
}

function PromoMealCard({
  item,
  isClosed,
  onSelect,
}: {
  item: PromoMealItem;
  isClosed?: boolean;
  onSelect: (item: PromoMealItem) => void;
}) {
  const basePrice = toNumber(item.base_price);
  const promoPrice = toNumber(item.promo_price ?? basePrice);

  return (
    <button
      type="button"
      disabled={isClosed}
      onClick={() => onSelect(item)}
      className={cn(
        "customer-press w-40 shrink-0 overflow-hidden rounded-xl border border-[var(--primary)]/40 bg-[var(--surface)] text-left shadow-[0_0_16px_rgba(224,122,95,0.15)]",
        isClosed && "opacity-60",
      )}
    >
      <div className="relative h-24 w-full">
        <MealImage
          name={item.name ?? "Promo meal"}
          imageUrl={item.image_url}
          className="h-full w-full rounded-none"
          sizes="160px"
        />
        <span className="absolute left-1.5 top-1.5 rounded-md bg-[var(--primary)] px-1.5 py-0.5 text-[10px] font-bold text-white">
          -{item.discount_percent}%
        </span>
      </div>
      <div className="p-2">
        <p className="truncate text-sm font-semibold">{item.name}</p>
        <div className="mt-0.5 flex items-center gap-1.5">
          <span className="price text-xs font-bold text-[var(--primary)]">
            {formatCurrency(promoPrice)}
          </span>
          {basePrice > promoPrice && (
            <span className="text-[10px] text-[var(--muted)] line-through">
              {formatCurrency(basePrice)}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}

export function PromoMealsRow({ items, isLoading, isClosed, onSelect }: PromoMealsRowProps) {
  if (isLoading) {
    return (
      <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-1">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="customer-shimmer h-44 w-40 shrink-0 rounded-xl" />
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return <p className="text-sm text-[var(--muted)]">Promo meals will appear here shortly.</p>;
  }

  const loopItems = [...items, ...items];
  const duration = Math.max(items.length * 5, 20);

  return (
    <div className="-mx-4 overflow-hidden px-4 pb-1">
      <div
        className="popular-scroll-track flex w-max gap-3"
        style={{ animationDuration: `${duration}s` }}
      >
        {loopItems.map((item, index) => (
          <PromoMealCard
            key={`${item.meal_id}-${index}`}
            item={item}
            isClosed={isClosed}
            onSelect={onSelect}
          />
        ))}
      </div>
    </div>
  );
}
