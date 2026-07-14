"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Order } from "@/lib/types";
import { fireUrgencyAlert } from "@/lib/urgency-alert";

const MUTE_STORAGE_KEY = "khayaos-order-alert-muted";
const SEEN_STORAGE_KEY = "khayaos-order-alert-seen-ids";

export function useNewOrderAlerts(liveOrders: Order[] | undefined) {
  const [newCount, setNewCount] = useState(0);
  const [muted, setMutedState] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(MUTE_STORAGE_KEY) === "1";
  });
  const seededRef = useRef(false);

  const setMuted = useCallback((value: boolean) => {
    setMutedState(value);
    localStorage.setItem(MUTE_STORAGE_KEY, value ? "1" : "0");
  }, []);

  const clearAlerts = useCallback(() => {
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
      return;
    }

    const seenSet = new Set(seen);
    const arrived = pendingIds.filter((id) => !seenSet.has(id));

    if (arrived.length > 0) {
      setNewCount((prev) => prev + arrived.length);
      if (!muted) {
        fireUrgencyAlert();
      }
    }

    const nextSeen = [...new Set([...seen.filter((id) => pendingSet.has(id)), ...pendingIds])];
    localStorage.setItem(SEEN_STORAGE_KEY, JSON.stringify(nextSeen));
  }, [liveOrders, muted]);

  return { newCount, muted, setMuted, clearAlerts };
}
