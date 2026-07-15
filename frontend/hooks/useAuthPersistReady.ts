"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/stores/auth-store";
import { authService } from "@/services/auth.service";

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
 * True once zustand auth persist has rehydrated from localStorage on the client.
 * Login screens must not gate on this; admin/platform guards must.
 */
export function useAuthPersistReady(timeoutMs = 2500): boolean {
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
        void Promise.resolve(api?.rehydrate?.()).then(mark).catch(mark);
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

/**
 * If localStorage has a token but the store has no session (SSR persist skip / corrupt blob),
 * restore via /auth/me. Returns true while recovery is in flight.
 */
export function useAuthSessionRecovery(enabled: boolean, onInvalidToken?: () => void): boolean {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const user = useAuthStore((s) => s.user);
  const setAuth = useAuthStore((s) => s.setAuth);
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const [recovering, setRecovering] = useState(false);

  useEffect(() => {
    if (!enabled || isAuthenticated) return;
    if (!hasStaffAuthToken()) return;

    let cancelled = false;
    setRecovering(true);

    void authService
      .me()
      .then((me) => {
        if (cancelled) return;
        const token = localStorage.getItem("khayaos_token");
        if (!token) {
          clearAuth();
          onInvalidToken?.();
          return;
        }
        setAuth(
          {
            id: me.id,
            name: me.name,
            email: me.email,
            role: me.role,
            tenant_id: me.tenant_id,
            tenant_slug: me.tenant_slug ?? null,
          },
          token,
        );
      })
      .catch(() => {
        if (cancelled) return;
        clearAuth();
        onInvalidToken?.();
      })
      .finally(() => {
        if (!cancelled) setRecovering(false);
      });

    return () => {
      cancelled = true;
    };
  }, [enabled, isAuthenticated, user?.id, setAuth, clearAuth, onInvalidToken]);

  return enabled || recovering;
}
