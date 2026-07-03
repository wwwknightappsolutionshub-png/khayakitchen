import type { MealBadgeType } from "@/lib/menu-meta";
import { getBadgeLabel, getLowStockMessage } from "@/lib/menu-meta";
import { cn } from "@/lib/utils";

interface MealBadgeProps {
  type: MealBadgeType;
  lowStockCount?: number;
  className?: string;
}

export function MealBadge({ type, lowStockCount, className }: MealBadgeProps) {
  const label =
    type === "low-stock" && lowStockCount
      ? getLowStockMessage(lowStockCount)
      : getBadgeLabel(type);

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium tracking-wide",
        type === "low-stock"
          ? "bg-[var(--primary)]/15 text-[var(--primary)]"
          : "bg-white/8 text-[var(--muted)]",
        className,
      )}
    >
      {label}
    </span>
  );
}
