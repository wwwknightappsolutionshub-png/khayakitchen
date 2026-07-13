"use client";

import { Bell, BellOff } from "lucide-react";
import { cn } from "@/lib/utils";

interface NewOrderAlertBadgeProps {
  count: number;
  muted: boolean;
  onToggleMute: () => void;
  onClear: () => void;
}

export function NewOrderAlertBadge({
  count,
  muted,
  onToggleMute,
  onClear,
}: NewOrderAlertBadgeProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={onClear}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold",
          count > 0
            ? "bg-danger/15 text-danger animate-pulse"
            : "bg-surface-elevated text-muted",
        )}
        title={count > 0 ? "Clear new order alerts" : "No new orders"}
      >
        <span
          className={cn(
            "h-2 w-2 rounded-full",
            count > 0 ? "bg-danger" : "bg-muted",
          )}
        />
        {count > 0 ? `${count} new order${count === 1 ? "" : "s"}` : "No new orders"}
      </button>
      <button
        type="button"
        onClick={onToggleMute}
        className="inline-flex items-center gap-1 rounded-full border border-border px-2.5 py-1 text-xs text-muted hover:text-foreground"
        title={muted ? "Unmute order alarm" : "Mute order alarm"}
      >
        {muted ? <BellOff className="h-3.5 w-3.5" /> : <Bell className="h-3.5 w-3.5" />}
        {muted ? "Muted" : "Alarm on"}
      </button>
    </div>
  );
}
