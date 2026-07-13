"use client";

import type { TopSellerRow } from "@/lib/order-analytics";
import { LoadingSkeleton } from "@/components/ui/LoadingSkeleton";
import { cn } from "@/lib/utils";

interface TopSellingItemsProps {
  items: TopSellerRow[];
  isLoading?: boolean;
}

const RANK_STYLES = [
  "border-amber-400/50 bg-amber-500/15 text-amber-700 dark:text-amber-300",
  "border-slate-300/60 bg-slate-400/15 text-slate-700 dark:text-slate-300",
  "border-orange-700/40 bg-orange-800/15 text-orange-800 dark:text-orange-300",
];

function rankClass(index: number): string {
  return RANK_STYLES[index] ?? "border-border bg-surface-elevated/50 text-foreground";
}

export function TopSellingItems({ items, isLoading }: TopSellingItemsProps) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <LoadingSkeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return <p className="text-sm text-muted">No sales recorded today yet.</p>;
  }

  const maxQty = Math.max(...items.map((item) => item.quantity), 1);

  return (
    <ul className="space-y-2">
      {items.map((item, index) => (
        <li
          key={`${item.type}-${item.label}-${index}`}
          className={cn(
            "relative overflow-hidden rounded-[var(--radius)] border px-3 py-2.5 text-sm",
            rankClass(index),
          )}
        >
          <div
            className="pointer-events-none absolute inset-y-0 left-0 bg-current opacity-10"
            style={{ width: `${Math.max(8, (item.quantity / maxQty) * 100)}%` }}
            aria-hidden
          />
          <div className="relative flex items-center justify-between gap-3">
            <span className="font-medium">
              <span className="mr-2 font-mono text-xs opacity-70">#{index + 1}</span>
              {item.label}
              {item.type === "addon" && (
                <span className="ml-2 text-xs opacity-70">(add-on)</span>
              )}
            </span>
            <span className="font-mono opacity-80">{item.quantity} sold</span>
          </div>
        </li>
      ))}
    </ul>
  );
}
