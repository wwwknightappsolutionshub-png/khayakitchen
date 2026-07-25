"use client";

import { useEffect, useRef, useState } from "react";
import { marketingService } from "@/services/marketing.service";
import { marketingTheme } from "@/lib/marketing-theme";
import { cn } from "@/lib/utils";

const START = 200;
const STEP = 10;
const CYCLE_MS = 10_000;
const VISIBLE_MS = 5_000;

/**
 * Social-proof toast: +10 every 10s, appears with new value,
 * shakes for 5s, then hides until the next tick.
 */
export function MarketingVisitorRotator() {
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
      const next = countRef.current + STEP;
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
        "pointer-events-none fixed bottom-24 left-4 z-40 max-w-[17rem] rounded-2xl border px-3.5 py-2.5 shadow-lg backdrop-blur-md sm:left-6",
        marketingTheme.surfaceBorder,
        "bg-[#14100c]/95 visitor-rotator-shake",
      )}
      aria-live="polite"
    >
      <p className={cn("text-[11px] font-semibold uppercase tracking-[0.16em]", marketingTheme.eyebrow)}>
        Now We Have
      </p>
      <p className="mt-1 text-sm font-semibold tabular-nums text-white">
        {count.toLocaleString()}
      </p>
      <p className="mt-0.5 text-xs text-zinc-400">who just joined us</p>
    </div>
  );
}
