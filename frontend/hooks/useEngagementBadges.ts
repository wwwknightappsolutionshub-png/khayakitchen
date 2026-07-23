"use client";

import { useCallback, useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { engagementService } from "@/services/engagement.service";
import {
  isUrgencyMuted,
  setUrgencyMuted,
  setUrgencyReason,
} from "@/lib/urgency-alert";
import { useAuthStore } from "@/stores/auth-store";
import { useHybridInterval } from "@/hooks/useHybridInterval";
import { useRealtimeEvent } from "@/hooks/useRealtimeEvent";

const MUTE_KEY = "khayaos-urgency-alert-muted";

/** Shared urgency mute — default is alarm ON (audio + vibrate). */
export function isUrgencyMutedShared(): boolean {
  return isUrgencyMuted();
}

export function setUrgencyMutedShared(muted: boolean): void {
  setUrgencyMuted(muted);
  if (typeof window !== "undefined") {
    localStorage.setItem(MUTE_KEY, muted ? "1" : "0");
  }
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
      if (
        event === "ChatMessageCreated" ||
        event === "OrderCreated" ||
        event === "OrderUpdated" ||
        event === "OrderStatusChanged" ||
        event === "OrderCancelled" ||
        event === "NewKitchenTicket"
      ) {
        queryClient.invalidateQueries({ queryKey: ["engagement", "notification-badges"] });
      }
      if (event === "ChatMessageCreated") {
        queryClient.invalidateQueries({ queryKey: ["engagement", "customer-threads"] });
      }
    },
    [queryClient],
  );
  useRealtimeEvent(onRealtime);

  // Recursive alarms: chat unread + kitchen ready awaiting receptionist confirmation.
  useEffect(() => {
    if (!enabled) {
      setUrgencyReason("chat", false);
      setUrgencyReason("kitchen_ready", false);
      return;
    }
    if (!badges.data) return;

    const unread = badges.data.unread_customer_messages ?? 0;
    const readyAwaiting = badges.data.ready_awaiting_completion ?? 0;
    const muted = isUrgencyMuted();

    if (!seeded.current) {
      seeded.current = true;
    }

    setUrgencyReason("chat", unread > 0 && !muted);
    setUrgencyReason("kitchen_ready", readyAwaiting > 0 && !muted);
  }, [enabled, badges.data]);

  useEffect(() => {
    return () => {
      setUrgencyReason("chat", false);
      setUrgencyReason("kitchen_ready", false);
    };
  }, []);

  return {
    unreadChat: badges.data?.unread_customer_messages ?? 0,
    unreadChatThreads: badges.data?.unread_chat_threads ?? 0,
    pendingReviews: badges.data?.pending_reviews ?? 0,
    pendingOrders: badges.data?.pending_orders ?? 0,
    kitchenTickets: badges.data?.kitchen_tickets ?? 0,
    readyAwaitingCompletion: badges.data?.ready_awaiting_completion ?? 0,
    crmAttention: badges.data?.crm_attention ?? 0,
    dashboardAttention: badges.data?.dashboard_attention ?? 0,
    isLoading: badges.isLoading,
    refetch: badges.refetch,
  };
}
