"use client";

import type { RestaurantOperationalStatus } from "@/lib/types";
import { StatusCountdown } from "@/components/customer/StatusCountdown";
import { cn } from "@/lib/utils";

const STATUS_STYLES: Record<
  RestaurantOperationalStatus,
  { label: string; tone: string; useFireIcon?: boolean }
> = {
  open: {
    label: "Open",
    tone: "border-[var(--secondary)]/40 bg-[var(--secondary)]/15 text-[var(--secondary)]",
  },
  closing_soon: {
    label: "Closing soon",
    tone: "border-amber-500/40 bg-amber-500/15 text-amber-200",
  },
  closed: {
    label: "Closed",
    tone: "border-red-500/40 bg-red-500/15 text-red-300",
  },
  promo_mode: {
    label: "Discount",
    tone: "border-[var(--primary)]/50 bg-[var(--primary)]/20 text-[var(--primary)] promo-status-pill",
    useFireIcon: true,
  },
};

const STATUS_EMOJI: Record<RestaurantOperationalStatus, string> = {
  open: "🟢",
  closing_soon: "🟠",
  closed: "🔴",
  promo_mode: "🔥",
};

interface RestaurantStatusPillProps {
  status?: RestaurantOperationalStatus;
  closingAt?: string | null;
  promoEndsAt?: string | null;
  className?: string;
}

export function RestaurantStatusPill({
  status = "open",
  closingAt,
  promoEndsAt,
  className,
}: RestaurantStatusPillProps) {
  const copy = STATUS_STYLES[status];

  return (
    <div
      className={cn(
        "flex max-w-[55vw] shrink-0 items-center gap-1 rounded-full border px-2 py-1 text-[10px] font-semibold leading-tight sm:max-w-none sm:gap-1.5 sm:px-2.5 sm:text-[11px] sm:leading-none",
        copy.tone,
        className,
      )}
    >
      <span
        className={cn(copy.useFireIcon && "promo-fire-icon inline-block shrink-0")}
        aria-hidden
      >
        {STATUS_EMOJI[status]}
      </span>
      <span className="truncate whitespace-nowrap">{copy.label}</span>
      {status === "closing_soon" && closingAt ? (
        <>
          <span className="hidden opacity-60 sm:inline" aria-hidden>
            ·
          </span>
          <StatusCountdown
            endsAt={closingAt}
            expiredLabel="Closed"
            className="font-mono text-[9px] font-bold tabular-nums sm:text-[10px]"
          />
        </>
      ) : null}
      {status === "promo_mode" && promoEndsAt ? (
        <>
          <span className="opacity-60" aria-hidden>
            ·
          </span>
          <span className="text-[9px] font-medium opacity-90">ends</span>
          <StatusCountdown
            endsAt={promoEndsAt}
            expiredLabel="Ended"
            className="font-mono text-[9px] font-bold tabular-nums sm:text-[10px]"
          />
        </>
      ) : null}
    </div>
  );
}
