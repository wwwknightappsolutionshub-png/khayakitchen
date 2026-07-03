"use client";

import type { TopSellerRow } from "@/lib/order-analytics";
import { LoadingSkeleton } from "@/components/ui/LoadingSkeleton";

interface TopSellingItemsProps {
  items: TopSellerRow[];
  isLoading?: boolean;
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

  return (
    <ul className="space-y-2">
      {items.map((item, index) => (
        <li
          key={`${item.type}-${item.label}-${index}`}
          className="flex items-center justify-between rounded-[var(--radius)] border border-border bg-surface-elevated/50 px-3 py-2.5 text-sm"
        >
          <span className="font-medium">
            {item.label}
            {item.type === "addon" && (
              <span className="ml-2 text-xs text-muted">(add-on)</span>
            )}
          </span>
          <span className="font-mono text-muted">{item.quantity} sold</span>
        </li>
      ))}
    </ul>
  );
}
