"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/stores/auth-store";

/**
 * Boots zustand auth persist in the background.
 * Never blocks rendering — /login must paint the form immediately.
 */
export function AuthHydration({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    let cancelled = false;

    const finish = () => {
      if (cancelled) return;
      useAuthStore.setState({ hasHydrated: true });
    };

    let unsubscribe: (() => void) | undefined;
    const safetyTimeout = window.setTimeout(finish, 300);

    try {
      const persistApi = useAuthStore.persist;
      if (persistApi?.hasHydrated?.()) {
        finish();
      } else {
        unsubscribe = persistApi?.onFinishHydration?.(finish);
      }
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
