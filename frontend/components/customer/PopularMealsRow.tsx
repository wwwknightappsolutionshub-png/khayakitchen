"use client";

import type { Meal } from "@/lib/types";
import type { MealPopularity } from "@/lib/order-analytics";
import { MealImage } from "@/components/customer/MealImage";
import { formatCurrency, cn } from "@/lib/utils";

interface PopularMealsRowProps {
  meals: Meal[];
  meta: MealPopularity[];
  isLoading?: boolean;
  isClosed?: boolean;
  hasLiveSalesData?: boolean;
  onSelect: (meal: Meal) => void;
}

function MealCard({
  meal,
  qty,
  hasLiveSalesData,
  isClosed,
  onSelect,
}: {
  meal: Meal;
  qty?: number;
  hasLiveSalesData?: boolean;
  isClosed?: boolean;
  onSelect: (meal: Meal) => void;
}) {
  return (
    <button
      type="button"
      disabled={isClosed}
      onClick={() => onSelect(meal)}
      className={cn(
        "customer-press w-36 shrink-0 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] text-left",
        isClosed && "opacity-60",
      )}
    >
      <div className="relative h-24 w-full">
        <MealImage
          name={meal.name}
          imageUrl={meal.image_url}
          className="h-full w-full rounded-none"
          sizes="144px"
        />
        {hasLiveSalesData && qty && qty > 0 && (
          <span className="absolute bottom-1 left-1 rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-medium text-white">
            {qty} today
          </span>
        )}
      </div>
      <div className="p-2">
        <p className="truncate text-sm font-semibold">{meal.name}</p>
        <p className="price text-xs text-[var(--primary)]">{formatCurrency(meal.base_price)}</p>
      </div>
    </button>
  );
}

export function PopularMealsRow({
  meals,
  meta,
  isLoading,
  isClosed,
  hasLiveSalesData,
  onSelect,
}: PopularMealsRowProps) {
  if (isLoading) {
    return (
      <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-1">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="customer-shimmer h-44 w-36 shrink-0 rounded-xl" />
        ))}
      </div>
    );
  }

  if (meals.length === 0) {
    return <p className="text-sm text-[var(--muted)]">Menu loading…</p>;
  }

  const qtyByMeal = new Map(meta.map((m) => [m.mealId, m.quantity]));
  const loopMeals = [...meals, ...meals];
  const duration = Math.max(meals.length * 5, 20);

  return (
    <div className="-mx-4 overflow-hidden px-4 pb-1">
      <div
        className="popular-scroll-track flex w-max gap-3"
        style={{ animationDuration: `${duration}s` }}
      >
        {loopMeals.map((meal, index) => (
          <MealCard
            key={`${meal.id}-${index}`}
            meal={meal}
            qty={qtyByMeal.get(meal.id)}
            hasLiveSalesData={hasLiveSalesData}
            isClosed={isClosed}
            onSelect={onSelect}
          />
        ))}
      </div>
    </div>
  );
}
