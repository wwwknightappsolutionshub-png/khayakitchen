"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Order } from "@/lib/types";
import {
  isUrgencyMuted,
  setUrgencyMuted,
  setUrgencyReason,
  unlockUrgencyAudio,
} from "@/lib/urgency-alert";

const MUTE_STORAGE_KEY = "khayaos-urgency-alert-muted";
const SEEN_STORAGE_KEY = "khayaos-order-alert-seen-ids";

/**
 * Pending-order badge + recursive urgency while any pending orders remain.
 * Mute/stop uses shared khayaos-urgency-alert-muted.
 */
export function useNewOrderAlerts(liveOrders: Order[] | undefined) {
  const [newCount, setNewCount] = useState(0);
  const [muted, setMutedState] = useState(() => {
    if (typeof window === "undefined") return false;
    const legacy = localStorage.getItem("khayaos-order-alert-muted");
    if (legacy !== null && localStorage.getItem(MUTE_STORAGE_KEY) === null) {
      localStorage.setItem(MUTE_STORAGE_KEY, legacy);
    }
    return localStorage.getItem(MUTE_STORAGE_KEY) === "1";
  });
  const seededRef = useRef(false);

  const setMuted = useCallback((value: boolean) => {
    unlockUrgencyAudio();
    setMutedState(value);
    setUrgencyMuted(value);
  }, []);

  const clearAlerts = useCallback(() => {
    unlockUrgencyAudio();
    setNewCount(0);
    const pendingIds = (liveOrders ?? [])
      .filter((o) => o.status === "pending")
      .map((o) => o.id);
    localStorage.setItem(SEEN_STORAGE_KEY, JSON.stringify(pendingIds));
  }, [liveOrders]);

  useEffect(() => {
    if (!liveOrders) return;

    const pendingIds = liveOrders.filter((o) => o.status === "pending").map((o) => o.id);
    const pendingSet = new Set(pendingIds);

    let seen: string[] = [];
    try {
      seen = JSON.parse(localStorage.getItem(SEEN_STORAGE_KEY) ?? "[]") as string[];
      if (!Array.isArray(seen)) seen = [];
    } catch {
      seen = [];
    }

    if (!seededRef.current) {
      seededRef.current = true;
      localStorage.setItem(SEEN_STORAGE_KEY, JSON.stringify(pendingIds));
      setNewCount(0);
      setUrgencyReason("new_order", pendingIds.length > 0 && !isUrgencyMuted());
      return;
    }

    const seenSet = new Set(seen);
    const arrived = pendingIds.filter((id) => !seenSet.has(id));

    if (arrived.length > 0) {
      setNewCount((prev) => prev + arrived.length);
    }

    // Recursive alarm while any pending order is unattended (unless muted).
    setUrgencyReason("new_order", pendingIds.length > 0 && !muted);

    const nextSeen = [...new Set([...seen.filter((id) => pendingSet.has(id)), ...pendingIds])];
    localStorage.setItem(SEEN_STORAGE_KEY, JSON.stringify(nextSeen));
  }, [liveOrders, muted]);

  useEffect(() => {
    return () => {
      setUrgencyReason("new_order", false);
    };
  }, []);

  return { newCount, muted, setMuted, clearAlerts };
}
