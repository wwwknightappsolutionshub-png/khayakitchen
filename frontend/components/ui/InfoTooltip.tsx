"use client";

import { useId } from "react";
import { Info } from "lucide-react";
import { cn } from "@/lib/utils";

interface InfoTooltipProps {
  label: string;
  text: string;
  className?: string;
}

/** Accessible info tooltip — shows a description box on hover or keyboard focus. */
export function InfoTooltip({ label, text, className }: InfoTooltipProps) {
  const tooltipId = useId();

  return (
    <span className={cn("group relative inline-flex", className)}>
      <button
        type="button"
        aria-label={`More information about ${label}`}
        aria-describedby={tooltipId}
        className="inline-flex h-4 w-4 items-center justify-center rounded-full text-muted transition-colors hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        <Info className="h-3.5 w-3.5" />
      </button>
      <span
        id={tooltipId}
        role="tooltip"
        className={cn(
          "pointer-events-none absolute left-1/2 top-6 z-50 w-56 -translate-x-1/2 rounded-lg border border-border bg-surface-elevated px-3 py-2",
          "text-xs font-normal leading-relaxed text-foreground shadow-lg",
          "opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100",
        )}
      >
        {text}
      </span>
    </span>
  );
}
