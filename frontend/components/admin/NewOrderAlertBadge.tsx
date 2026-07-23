"use client";

import { Bell, BellOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { unlockUrgencyAudio } from "@/lib/urgency-alert";

interface NewOrderAlertBadgeProps {
  count: number;
  muted: boolean;
  onToggleMute: () => void;
  onClear: () => void;
  /** Extra label when ready orders await receptionist confirmation */
  readyAwaiting?: number;
  unreadChat?: number;
}

export function NewOrderAlertBadge({
  count,
  muted,
  onToggleMute,
  onClear,
  readyAwaiting = 0,
  unreadChat = 0,
}: NewOrderAlertBadgeProps) {
  const active = count > 0 || readyAwaiting > 0 || unreadChat > 0;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={() => {
          unlockUrgencyAudio();
          onClear();
        }}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold",
          active ? "animate-pulse bg-danger/15 text-danger" : "bg-surface-elevated text-muted",
        )}
        title={
          active
            ? "Acknowledge new-order badge (alarm continues until handled or muted)"
            : "No open urgency"
        }
      >
        <span className={cn("h-2 w-2 rounded-full", active ? "bg-danger" : "bg-muted")} />
        {count > 0
          ? `${count} new order${count === 1 ? "" : "s"}`
          : readyAwaiting > 0
            ? `${readyAwaiting} ready to confirm`
            : unreadChat > 0
              ? `${unreadChat} chat`
              : "No new orders"}
      </button>
      <button
        type="button"
        onClick={() => {
          unlockUrgencyAudio();
          onToggleMute();
        }}
        className="inline-flex items-center gap-1 rounded-full border border-border px-2.5 py-1 text-xs text-muted hover:text-foreground"
        title={
          muted
            ? "Unmute recursive alarm (tone + vibration)"
            : "Mute recursive alarm (stops tone + vibration until unmuted)"
        }
      >
        {muted ? <BellOff className="h-3.5 w-3.5" /> : <Bell className="h-3.5 w-3.5" />}
        {muted ? "Muted" : "Alarm on"}
      </button>
    </div>
  );
}
