"use client";

import { useEffect, useMemo, useState } from "react";
import { useMarketingTheme } from "@/providers/MarketingThemeProvider";
import { cn } from "@/lib/utils";

function msUntilMidnight(): number {
  const now = new Date();
  const end = new Date(now);
  end.setHours(24, 0, 0, 0);
  return Math.max(0, end.getTime() - now.getTime());
}

function formatRemaining(ms: number): { h: string; m: string; s: string } {
  const total = Math.floor(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return {
    h: String(h).padStart(2, "0"),
    m: String(m).padStart(2, "0"),
    s: String(s).padStart(2, "0"),
  };
}

export function MarketingUrgencyCountdown() {
  const { theme } = useMarketingTheme();
  const [remaining, setRemaining] = useState(msUntilMidnight);

  useEffect(() => {
    const id = window.setInterval(() => setRemaining(msUntilMidnight()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const parts = useMemo(() => formatRemaining(remaining), [remaining]);

  return (
    <div className="mt-6">
      <p className={cn("text-xs font-semibold uppercase tracking-[0.18em]", theme.eyebrow)}>
        Free workspace window closes in
      </p>
      <div className="mt-3 flex gap-2" aria-label="Countdown to midnight">
        {(
          [
            ["Hours", parts.h],
            ["Mins", parts.m],
            ["Secs", parts.s],
          ] as const
        ).map(([label, value]) => (
          <div
            key={label}
            className={cn(
              "min-w-[4.25rem] rounded-xl border px-3 py-2 text-center",
              theme.surfaceBorder,
              "bg-gradient-to-b from-amber-500/15 to-transparent",
            )}
          >
            <div className={cn("font-mono text-2xl font-bold tabular-nums", theme.heading)}>
              {value}
            </div>
            <div className={cn("mt-0.5 text-[10px] uppercase tracking-wider", theme.subtle)}>
              {label}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
