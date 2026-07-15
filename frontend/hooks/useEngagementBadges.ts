"use client";

import { useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { engagementService } from "@/services/engagement.service";
import { fireUrgencyAlert } from "@/lib/urgency-alert";
import { useAuthStore } from "@/stores/auth-store";
import { useHybridInterval } from "@/hooks/useHybridInterval";
import { useRealtimeEvent } from "@/hooks/useRealtimeEvent";
import { useCallback } from "react";

const MUTE_KEY = "khayaos-urgency-alert-muted";
const SEEN_CHAT_KEY = "khayaos-chat-alert-seen";

/** Shared urgency mute — default is alarm ON (audio + vibrate). */
export function isUrgencyMuted(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(MUTE_KEY) === "1";
}

export function setUrgencyMuted(muted: boolean): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(MUTE_KEY, muted ? "1" : "0");
}

export function useEngagementBadges() {
  const role = useAuthStore((s) => s.user?.role);
  const enabled = !!role && ["owner", "manager", "staff"].includes(role);
  const poll = useHybridInterval(5_000, 12_000);
  const queryClient = useQueryClient();
  const seeded = useRef(false);

  const badges = useQuery({
    queryKey: ["engagement", "notification-badges"],
    queryFn: () => engagementService.getNotificationBadges(),
    enabled,
    refetchInterval: enabled ? poll : false,
  });

  const onRealtime = useCallback(
    (event: string) => {
      if (event === "ChatMessageCreated") {
        queryClient.invalidateQueries({ queryKey: ["engagement", "notification-badges"] });
        queryClient.invalidateQueries({ queryKey: ["engagement", "customer-threads"] });
      }
    },
    [queryClient],
  );
  useRealtimeEvent(onRealtime);

  // Audio+vibrate when unread customer messages increase (default unmuted).
  useEffect(() => {
    if (!enabled || !badges.data) return;
    const count = badges.data.unread_customer_messages;
    let seen = 0;
    try {
      seen = Number(localStorage.getItem(SEEN_CHAT_KEY) ?? "0");
      if (Number.isNaN(seen)) seen = 0;
    } catch {
      seen = 0;
    }

    if (!seeded.current) {
      seeded.current = true;
      localStorage.setItem(SEEN_CHAT_KEY, String(count));
      return;
    }

    if (count > seen && !isUrgencyMuted()) {
      fireUrgencyAlert();
    }
    localStorage.setItem(SEEN_CHAT_KEY, String(count));
  }, [enabled, badges.data]);

  return {
    unreadChat: badges.data?.unread_customer_messages ?? 0,
    unreadChatThreads: badges.data?.unread_chat_threads ?? 0,
    pendingReviews: badges.data?.pending_reviews ?? 0,
    isLoading: badges.isLoading,
    refetch: badges.refetch,
  };
}
