"use client";

import type { Meal } from "@/lib/types";
import { MealImage } from "@/components/customer/MealImage";
import { CustomerButton } from "@/components/customer/CustomerButton";
import { formatCurrency } from "@/lib/utils";

interface FeaturedMealCardProps {
  meal?: Meal;
  isLoading?: boolean;
  isClosed?: boolean;
  showLiveBadge?: boolean;
  onOrder: (meal: Meal) => void;
}

export function FeaturedMealCard({
  meal,
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
      </div>
      <div className="flex items-end justify-between gap-4 p-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight">{meal.name}</h2>
          <p className="price mt-1 text-2xl text-[var(--primary)]">
            {formatCurrency(meal.base_price)}
          </p>
        </div>
        <CustomerButton
          size="lg"
          className="featured-order-btn shrink-0"
          disabled={isClosed}
          onClick={() => onOrder(meal)}
        >
          {isClosed ? "Closed" : "Order now"}
        </CustomerButton>
      </div>
    </article>
  );
}
