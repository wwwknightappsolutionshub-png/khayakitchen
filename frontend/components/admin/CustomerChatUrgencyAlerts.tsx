"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/stores/auth-store";
import { useEngagementBadges } from "@/hooks/useEngagementBadges";

/**
 * Keeps engagement badge queries warm for owner/manager and relies on
 * useEngagementBadges for default audio + vibration on new customer chats.
 */
export function CustomerChatUrgencyAlerts() {
  const role = useAuthStore((s) => s.user?.role);
  const enabled = role === "owner" || role === "manager";
  const queryClient = useQueryClient();
  const badges = useEngagementBadges();

  useEffect(() => {
    if (!enabled) return;
    void queryClient.invalidateQueries({ queryKey: ["engagement", "customer-threads"] });
  }, [enabled, badges.unreadChat, queryClient]);

  return null;
}
