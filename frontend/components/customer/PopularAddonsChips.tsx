"use client";

import type { AddonPopularity } from "@/lib/order-analytics";
import { cn } from "@/lib/utils";

interface PopularAddonsChipsProps {
  addons: AddonPopularity[];
  isLoading?: boolean;
  isClosed?: boolean;
  onSelect: (addon: AddonPopularity) => void;
}

export function PopularAddonsChips({
  addons,
  isLoading,
  isClosed,
  onSelect,
}: PopularAddonsChipsProps) {
  if (isLoading) {
    return (
      <div className="flex flex-wrap gap-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="customer-shimmer h-9 w-28 rounded-full" />
        ))}
      </div>
    );
  }

  if (addons.length === 0) {
    return <p className="text-sm text-[var(--muted)]">No add-ons on the menu yet.</p>;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {addons.slice(0, 6).map((addon) => (
        <button
          key={addon.optionId}
          type="button"
          disabled={isClosed}
          onClick={() => onSelect(addon)}
          className={cn(
            "customer-press rounded-full border border-[var(--border)] bg-[var(--surface-elevated)] px-4 py-2 text-sm font-medium",
            "hover:border-[var(--primary)]/40 hover:text-[var(--primary)]",
            isClosed && "opacity-50",
          )}
        >
          {addon.name}
          {addon.quantity > 0 && (
            <span className="ml-1.5 text-xs text-[var(--muted)]">· {addon.quantity}</span>
          )}
        </button>
      ))}
    </div>
  );
}
