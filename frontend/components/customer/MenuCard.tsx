"use client";

import type { Meal } from "@/lib/types";
import { MealImage } from "@/components/customer/MealImage";
import { MealBadge } from "@/components/customer/MealBadge";
import { getMealBadges, getPairingSuggestion } from "@/lib/menu-meta";
import { formatCurrency, cn } from "@/lib/utils";

interface MenuCardProps {
  meal: Meal;
  onSelect: (meal: Meal) => void;
  highlighted?: boolean;
  priority?: boolean;
}

export function MenuCard({ meal, onSelect, highlighted, priority }: MenuCardProps) {
  const badges = getMealBadges(meal);
  const pairing = getPairingSuggestion(meal.name);

  return (
    <button
      type="button"
      onClick={() => onSelect(meal)}
      className={cn(
        "customer-press group w-full overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] text-left",
        "shadow-[0_2px_12px_rgba(0,0,0,0.2)] transition-[transform,box-shadow,border-color] duration-200",
        "hover:border-[var(--primary)]/25 hover:shadow-[0_8px_24px_rgba(0,0,0,0.35)]",
        highlighted && "border-[var(--primary)]/50",
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
        {badges.length > 0 && (
          <div className="absolute left-2 top-2 flex flex-wrap gap-1">
            {badges.map((badge) => (
              <MealBadge key={badge} type={badge} />
            ))}
          </div>
        )}
      </div>

      <div className="relative p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h3 className="text-base font-semibold leading-tight">{meal.name}</h3>
            {meal.description && (
              <p className="mt-1 truncate text-sm text-[var(--muted)]">{meal.description}</p>
            )}
            {pairing && (
              <p className="mt-2 text-xs text-[var(--secondary)]">{pairing}</p>
            )}
          </div>
          <p className="price shrink-0 text-base text-[var(--primary)]">
            {formatCurrency(meal.base_price)}
          </p>
        </div>
      </div>
    </button>
  );
}
