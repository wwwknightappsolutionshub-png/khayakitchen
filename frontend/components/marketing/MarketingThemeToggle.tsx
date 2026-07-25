"use client";

import { Moon, Sun } from "lucide-react";
import { useMarketingTheme } from "@/providers/MarketingThemeProvider";
import { cn } from "@/lib/utils";

/** Sticky-nav control — marketing preference only (not tenant ui_theme). */
export function MarketingThemeToggle({ className }: { className?: string }) {
  const { mode, toggle, ready } = useMarketingTheme();
  const isLight = mode === "light";

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={isLight ? "Switch to dark theme" : "Switch to light theme"}
      title={isLight ? "Dark mode" : "Light mode"}
      className={cn(
        "inline-flex h-9 w-9 items-center justify-center rounded-full border transition-colors",
        isLight
          ? "border-stone-200 bg-white text-amber-700 hover:bg-[#efe8df]"
          : "border-white/10 bg-[#14100c] text-amber-200 hover:bg-[#1c1612]",
        !ready && "opacity-0",
        className,
      )}
    >
      {isLight ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
    </button>
  );
}
