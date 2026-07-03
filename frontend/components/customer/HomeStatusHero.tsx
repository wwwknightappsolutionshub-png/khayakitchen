"use client";

import type { RestaurantOperationalStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

const COPY: Record<
  RestaurantOperationalStatus,
  { emoji: string; message: string; tone: string }
> = {
  open: {
    emoji: "🟢",
    message: "We're open — fresh meals available",
    tone: "bg-[var(--secondary)]/12 text-[var(--secondary)] border-[var(--secondary)]/25",
  },
  closing_soon: {
    emoji: "🟠",
    message: "Closing soon — last orders",
    tone: "bg-amber-500/12 text-amber-300 border-amber-500/25",
  },
  closed: {
    emoji: "🔴",
    message: "We are currently closed",
    tone: "bg-red-500/12 text-red-300 border-red-500/25",
  },
  promo_mode: {
    emoji: "🔥",
    message: "Limited time offer active",
    tone: "bg-[var(--primary)]/12 text-[var(--primary)] border-[var(--primary)]/25",
  },
};

interface HomeStatusHeroProps {
  status?: RestaurantOperationalStatus;
  isLoading?: boolean;
}

export function HomeStatusHero({ status = "open", isLoading }: HomeStatusHeroProps) {
  const copy = COPY[status];

  if (isLoading) {
    return <div className="customer-shimmer h-16 w-full rounded-2xl" />;
  }

  return (
    <div
      className={cn(
        "rounded-2xl border px-4 py-4 text-center text-sm font-medium",
        copy.tone,
      )}
    >
      <span className="mr-1.5 text-base">{copy.emoji}</span>
      {copy.message}
    </div>
  );
}
