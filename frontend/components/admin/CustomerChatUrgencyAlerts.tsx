"use client";

import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { engagementService } from "@/services/engagement.service";
import { fireUrgencyAlert } from "@/lib/urgency-alert";
import { useAuthStore } from "@/stores/auth-store";

const SEEN_KEY = "khayaos-chat-alert-seen";
const MUTE_KEY = "khayaos-order-alert-muted";

/**
 * Polls customer chat threads for owner/manager and fires siren + vibrate
 * when a new customer-originated message arrives.
 */
export function CustomerChatUrgencyAlerts() {
  const role = useAuthStore((s) => s.user?.role);
  const enabled = role === "owner" || role === "manager";
  const seeded = useRef(false);

  const threads = useQuery({
    queryKey: ["engagement", "customer-threads", "urgency"],
    queryFn: () => engagementService.listTenantCustomerThreads(),
    enabled,
    refetchInterval: enabled ? 8000 : false,
  });

  useEffect(() => {
    if (!enabled || !threads.data?.threads) return;

    const fingerprints = threads.data.threads
      .map((t) => {
        const last = t.messages?.[0];
        if (!last || last.sender_type !== "customer") return null;
        return `${t.id}:${last.id}`;
      })
      .filter((v): v is string => Boolean(v));

    let seen: string[] = [];
    try {
      seen = JSON.parse(localStorage.getItem(SEEN_KEY) ?? "[]") as string[];
      if (!Array.isArray(seen)) seen = [];
    } catch {
      seen = [];
    }

    if (!seeded.current) {
      seeded.current = true;
      localStorage.setItem(SEEN_KEY, JSON.stringify(fingerprints));
      return;
    }

    const seenSet = new Set(seen);
    const arrived = fingerprints.filter((fp) => !seenSet.has(fp));
    const muted = localStorage.getItem(MUTE_KEY) === "1";

    if (arrived.length > 0 && !muted) {
      fireUrgencyAlert();
    }

    localStorage.setItem(SEEN_KEY, JSON.stringify(fingerprints));
  }, [enabled, threads.data]);

  return null;
}
