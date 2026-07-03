"use client";

import { useStorefront } from "@/hooks/useStorefront";

const STATUS_COPY = {
  open: { label: "We are open", tone: "bg-[var(--secondary)]/15 text-[var(--secondary)] border-[var(--secondary)]/30" },
  closing_soon: {
    label: "Closing soon — last orders",
    tone: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  },
  closed: {
    label: "Currently closed",
    tone: "bg-red-500/15 text-red-300 border-red-500/30",
  },
  promo_mode: {
    label: "Limited time offer active",
    tone: "bg-[var(--primary)]/15 text-[var(--primary)] border-[var(--primary)]/30",
  },
} as const;

export function RestaurantStatusBanner() {
  const { data } = useStorefront();
  const status = data?.status?.status ?? "open";
  const copy = STATUS_COPY[status];

  return (
    <div className={`border-b px-4 py-2 text-center text-sm font-medium ${copy.tone}`}>
      <span className="mr-1.5">
        {status === "open" && "🟢"}
        {status === "closing_soon" && "🟠"}
        {status === "closed" && "🔴"}
        {status === "promo_mode" && "🔥"}
      </span>
      {copy.label}
    </div>
  );
}
