"use client";

import Link from "next/link";
import { useStorefront } from "@/hooks/useStorefront";
import { NewsTicker } from "@/components/customer/NewsTicker";
import { RestaurantStatusPill } from "@/components/customer/RestaurantStatusPill";
import { parseTickerMessages } from "@/lib/ticker-defaults";

export function CustomerHeader() {
  const { data } = useStorefront();
  const name = data?.branding?.restaurant_name ?? "Khaya Kitchen";
  const logo = data?.branding?.logo_url;
  const status = data?.status?.status ?? "open";
  const closingAt = data?.status?.closing_at ?? null;
  const promoEndsAt = data?.status?.promo_ends_at ?? null;
  const tickerEnabled = data?.branding?.ticker_enabled ?? true;
  const tickerMessages = parseTickerMessages(data?.branding?.ticker_text);
  const showTicker = tickerEnabled && tickerMessages.length > 0;

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--border)] bg-[var(--background)]/90 backdrop-blur-md">
      <div className="mx-auto max-w-lg px-4 pt-3">
        <div className="flex items-center justify-between gap-3 pb-2.5">
          <Link href="/" className="flex min-w-0 flex-1 items-center gap-2.5">
            {logo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logo} alt="" className="h-9 w-9 shrink-0 rounded-lg object-cover" />
            ) : (
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--primary)]/20 text-sm font-bold text-[var(--primary)]">
                {name.charAt(0)}
              </span>
            )}
            <span className="truncate text-base font-semibold leading-tight tracking-tight">{name}</span>
          </Link>
          <RestaurantStatusPill status={status} closingAt={closingAt} promoEndsAt={promoEndsAt} />
        </div>
        {showTicker && (
          <div className="w-full overflow-hidden pb-2.5">
            <NewsTicker messages={tickerMessages} />
          </div>
        )}
      </div>
    </header>
  );
}
