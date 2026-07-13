"use client";

import { NewsTicker } from "@/components/customer/NewsTicker";

interface ReviewTickerProps {
  items: { customer_name: string; summary: string }[];
}

export function ReviewTicker({ items }: ReviewTickerProps) {
  if (items.length === 0) return null;

  const messages = items.map((item) => `${item.customer_name}: ${item.summary}`);

  return (
    <div className="border-t border-[var(--border)] bg-[var(--surface)] px-4 py-3">
      <p className="mb-1 text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
        Kitchen reviews
      </p>
      <NewsTicker messages={messages} />
    </div>
  );
}
