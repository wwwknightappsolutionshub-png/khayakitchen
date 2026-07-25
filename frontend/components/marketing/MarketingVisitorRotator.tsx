"use client";

import { useEffect, useRef, useState } from "react";
import { marketingService } from "@/services/marketing.service";
import { useMarketingTheme } from "@/providers/MarketingThemeProvider";
import { cn } from "@/lib/utils";

const START = 200;
const CYCLE_MS = 20_000;
const VISIBLE_MS = 5_000;

function randomStep(): number {
  return 1 + Math.floor(Math.random() * 10);
}

/**
 * Social-proof toast: +1..10 every 20s, appears with new value,
 * shakes for 5s, then hides until the next tick.
 */
export function MarketingVisitorRotator() {
  const { theme } = useMarketingTheme();
  const [count, setCount] = useState(START);
  const [visible, setVisible] = useState(false);
  const [ready, setReady] = useState(false);
  const countRef = useRef(START);
  const hideTimerRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    void marketingService
      .visitorHit()
      .then((res) => {
        if (cancelled) return;
        const next = Math.max(START, res.display_count);
        countRef.current = next;
        setCount(next);
        setReady(true);
        setVisible(true);
        hideTimerRef.current = window.setTimeout(() => setVisible(false), VISIBLE_MS);
      })
      .catch(() => {
        if (!cancelled) {
          countRef.current = START;
          setCount(START);
          setReady(true);
          setVisible(true);
          hideTimerRef.current = window.setTimeout(() => setVisible(false), VISIBLE_MS);
        }
      });

    return () => {
      cancelled = true;
      if (hideTimerRef.current) window.clearTimeout(hideTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!ready) return;

    const id = window.setInterval(() => {
      const next = countRef.current + randomStep();
      countRef.current = next;
      setCount(next);
      setVisible(true);
      if (hideTimerRef.current) window.clearTimeout(hideTimerRef.current);
      hideTimerRef.current = window.setTimeout(() => setVisible(false), VISIBLE_MS);
    }, CYCLE_MS);

    return () => {
      window.clearInterval(id);
      if (hideTimerRef.current) window.clearTimeout(hideTimerRef.current);
    };
  }, [ready]);

  if (!visible) return null;

  return (
    <div
      className={cn(
        "pointer-events-none fixed bottom-24 left-4 z-40 max-w-[17rem] rounded-2xl border px-3.5 py-2.5 shadow-lg backdrop-blur-md sm:left-6 visitor-rotator-shake",
        theme.surfaceBorder,
        theme.toastSurface,
      )}
      aria-live="polite"
    >
      <p className={cn("text-[11px] font-semibold uppercase tracking-[0.16em]", theme.eyebrow)}>
        Now We Have
      </p>
      <p className={cn("mt-1 text-sm font-semibold tabular-nums", theme.heading)}>
        {count.toLocaleString()}
      </p>
      <p className={cn("mt-0.5 text-xs", theme.muted)}>who just joined us</p>
    </div>
  );
}
