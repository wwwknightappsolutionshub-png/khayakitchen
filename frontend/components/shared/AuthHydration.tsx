"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/stores/auth-store";

/**
 * Client-only auth persist rehydrate. skipHydration is set on the store so SSR
 * never marks the session empty-and-hydrated (that caused endless dashboard spinners).
 */
export function AuthHydration({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    let cancelled = false;

    const finish = () => {
      if (cancelled) return;
      useAuthStore.setState({ hasHydrated: true });
    };

    let unsubscribe: (() => void) | undefined;
    const safetyTimeout = window.setTimeout(finish, 2000);

    try {
      const persistApi = useAuthStore.persist;
      unsubscribe = persistApi?.onFinishHydration?.(finish);
      void Promise.resolve(persistApi?.rehydrate?.()).then(finish).catch(finish);
    } catch {
      finish();
    }

    return () => {
      cancelled = true;
      window.clearTimeout(safetyTimeout);
      unsubscribe?.();
    };
  }, []);

  return <>{children}</>;
}
