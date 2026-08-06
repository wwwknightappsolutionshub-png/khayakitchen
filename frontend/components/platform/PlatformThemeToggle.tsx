"use client";

import { Moon, Sun } from "lucide-react";
import { usePlatformTheme } from "@/providers/PlatformThemeProvider";
import { cn } from "@/lib/utils";

/** Platform preference only — does not change tenant or marketing theme. */
export function PlatformThemeToggle({ className }: { className?: string }) {
  const { mode, toggle, ready, chrome } = usePlatformTheme();
  const isLight = mode === "light";

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={isLight ? "Switch to dark theme" : "Switch to light theme"}
      title={isLight ? "Dark mode" : "Light mode"}
      className={cn(
        "inline-flex h-9 w-9 items-center justify-center rounded-[var(--radius)] border transition-colors",
        chrome.toggle,
        !ready && "opacity-0",
        className,
      )}
    >
      {isLight ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
    </button>
  );
}
