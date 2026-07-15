"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/stores/auth-store";

/** Sync read — true when a staff token is already in localStorage. */
export function hasStaffAuthToken(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return Boolean(localStorage.getItem("khayaos_token"));
  } catch {
    return false;
  }
}

/**
 * True once zustand auth persist has rehydrated from localStorage.
 * Login screens must not gate on this; admin/platform guards must.
 */
export function useAuthPersistReady(timeoutMs = 1500): boolean {
  const storeHydrated = useAuthStore((s) => s.hasHydrated);
  const [persistReady, setPersistReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let unsubscribe: (() => void) | undefined;
    let timer = 0;

    const mark = () => {
      if (cancelled) return;
      setPersistReady(true);
      useAuthStore.setState({ hasHydrated: true });
    };

    try {
      const api = useAuthStore.persist;
      if (api?.hasHydrated?.()) {
        mark();
      } else {
        unsubscribe = api?.onFinishHydration?.(mark);
        timer = window.setTimeout(mark, timeoutMs);
      }
    } catch {
      mark();
    }

    return () => {
      cancelled = true;
      unsubscribe?.();
      if (timer) window.clearTimeout(timer);
    };
  }, [timeoutMs]);

  return persistReady || storeHydrated;
}
