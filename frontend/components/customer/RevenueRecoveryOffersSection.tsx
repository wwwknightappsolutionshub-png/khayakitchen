"use client";

import type { PromoMealItem } from "@/lib/types";
import { PromoMealsRow } from "@/components/customer/PromoMealsRow";
import { StatusCountdown } from "@/components/customer/StatusCountdown";

interface RevenueRecoveryOffersSectionProps {
  items: PromoMealItem[];
  isLoading?: boolean;
  isClosed?: boolean;
  onSelect: (item: PromoMealItem) => void;
}

export function RevenueRecoveryOffersSection({
  items,
  isLoading,
  isClosed,
  onSelect,
}: RevenueRecoveryOffersSectionProps) {
  const endsAt = items[0]?.ends_at;

  return (
    <section className="overflow-hidden rounded-2xl border border-secondary/30 bg-secondary/5 p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-lg" aria-hidden>
            ♻️
          </span>
          <h2 className="text-lg font-bold tracking-tight text-[var(--foreground)]">
            Limited-time savings
          </h2>
        </div>
        {endsAt ? (
          <div className="flex items-center gap-1.5 rounded-full border border-secondary/40 bg-secondary/10 px-2.5 py-1 text-[11px] font-semibold text-secondary">
            <span>Ends</span>
            <StatusCountdown
              endsAt={endsAt}
              expiredLabel="Ended"
              className="font-mono text-[10px] font-bold tabular-nums"
            />
          </div>
        ) : null}
      </div>
      <PromoMealsRow items={items} isLoading={isLoading} isClosed={isClosed} onSelect={onSelect} />
    </section>
  );
}
