"use client";

import { useEffect, useState } from "react";
import { marketingService } from "@/services/marketing.service";
import { marketingTheme } from "@/lib/marketing-theme";
import { cn } from "@/lib/utils";

const START = 200;
const STEP = 10;
const TICK_MS = 3_000;

/** Social-proof counter: server IP-backed base + +10 every 3s while viewing. */
export function MarketingVisitorRotator() {
  const [count, setCount] = useState(START);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void marketingService
      .visitorHit()
      .then((res) => {
        if (cancelled) return;
        setCount(Math.max(START, res.display_count));
        setReady(true);
      })
      .catch(() => {
        if (!cancelled) {
          setCount(START);
          setReady(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!ready) return;
    const id = window.setInterval(() => {
      setCount((n) => n + STEP);
    }, TICK_MS);
    return () => window.clearInterval(id);
  }, [ready]);

  return (
    <div
      className={cn(
        "pointer-events-none fixed bottom-24 left-4 z-40 max-w-[16rem] rounded-2xl border px-3 py-2 shadow-lg backdrop-blur-md sm:left-6",
        marketingTheme.surfaceBorder,
        "bg-[#14100c]/90",
      )}
      aria-live="polite"
    >
      <p className="text-[11px] uppercase tracking-wider text-zinc-500">Live signups</p>
      <p className="mt-0.5 text-sm font-semibold text-white">
        <span className={marketingTheme.eyebrow}>{count.toLocaleString()}</span>
        <span className="font-normal text-zinc-400"> people just signed up</span>
      </p>
    </div>
  );
}
