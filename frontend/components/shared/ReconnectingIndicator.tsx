"use client";

import { useRealtimeStatus } from "@/providers/RealtimeProvider";
import { cn } from "@/lib/utils";

export function ReconnectingIndicator({ className }: { className?: string }) {
  const { isConnected, mode, isReconnecting } = useRealtimeStatus();

  if (isConnected && mode === "websocket") {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full bg-secondary/15 px-2.5 py-1 text-xs text-secondary",
          className,
        )}
      >
        <span className="h-1.5 w-1.5 rounded-full bg-secondary" />
        Live
      </span>
    );
  }

  if (!isReconnecting) return null;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 px-2.5 py-1 text-xs text-amber-400",
        className,
      )}
    >
      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-400" />
      Reconnecting…
    </span>
  );
}
