import type { MealBadgeType } from "@/lib/menu-meta";
import { getBadgeLabel, getLowStockMessage } from "@/lib/menu-meta";
import { cn } from "@/lib/utils";

interface MealBadgeProps {
  type: MealBadgeType;
  lowStockCount?: number;
  className?: string;
}

const BADGE_TONES: Record<MealBadgeType, string> = {
  "most-ordered": "border-[var(--primary)]/40 bg-[var(--primary)]/15 text-[var(--primary)]",
  "chefs-pick": "border-emerald-700/50 bg-emerald-600 text-white",
  "popular-today": "border-amber-700/50 bg-amber-600 text-white",
  "low-stock": "border-[var(--primary)]/40 bg-[var(--primary)]/15 text-[var(--primary)]",
};

export function MealBadge({ type, lowStockCount, className }: MealBadgeProps) {
  const label =
    type === "low-stock" && lowStockCount
      ? getLowStockMessage(lowStockCount)
      : getBadgeLabel(type);

  return (
    <span
      className={cn(
        "inline-flex max-w-full items-center truncate rounded-md border px-2 py-1 text-xs font-semibold leading-tight tracking-wide",
        BADGE_TONES[type],
        className,
      )}
    >
      {label}
    </span>
  );
}
