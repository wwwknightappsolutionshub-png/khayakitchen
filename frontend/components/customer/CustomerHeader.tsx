"use client";

import Link from "next/link";
import { useStorefront } from "@/hooks/useStorefront";
import { NewsTicker } from "@/components/customer/NewsTicker";
import { parseTickerMessages } from "@/lib/ticker-defaults";

export function CustomerHeader() {
  const { data } = useStorefront();
  const name = data?.branding?.restaurant_name ?? "Khaya Kitchen";
  const logo = data?.branding?.logo_url;
  const tickerEnabled = data?.branding?.ticker_enabled ?? true;
  const tickerMessages = parseTickerMessages(data?.branding?.ticker_text);
  const showTicker = tickerEnabled && tickerMessages.length > 0;

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--border)] bg-[var(--background)]/90 backdrop-blur-md">
      <div className="mx-auto max-w-lg px-4 pt-3">
        <Link href="/" className="flex min-w-0 items-center gap-2">
          {logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logo} alt="" className="h-8 w-8 shrink-0 rounded-lg object-cover" />
          ) : null}
          <div className="flex min-w-0 flex-col">
            <span className="text-[10px] font-medium uppercase tracking-[0.14em] text-[var(--muted)]">
              {name}
            </span>
            {!showTicker && (
              <span className="text-base font-semibold leading-tight tracking-tight">Order</span>
            )}
          </div>
        </Link>
        {showTicker && (
          <div className="mt-1.5 w-full pb-2.5">
            <NewsTicker messages={tickerMessages} />
          </div>
        )}
      </div>
    </header>
  );
}
