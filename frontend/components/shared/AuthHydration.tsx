"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/stores/auth-store";

/**
 * Waits for zustand persist rehydration before rendering the app.
 * Uses the store's `hasHydrated` flag (set by onRehydrateStorage) as the
 * source of truth, with a short safety timeout so /login never hangs.
 */
export function AuthHydration({ children }: { children: React.ReactNode }) {
  const hasHydrated = useAuthStore((s) => s.hasHydrated);

  useEffect(() => {
    const finish = () => {
      useAuthStore.getState().setHasHydrated(true);
    };

    let unsubscribe: (() => void) | undefined;
    let safetyTimeout = 0;

    try {
      const persistApi = useAuthStore.persist;
      if (persistApi?.hasHydrated?.()) {
        finish();
        return;
      }

      unsubscribe = persistApi?.onFinishHydration?.(() => {
        finish();
        if (safetyTimeout) window.clearTimeout(safetyTimeout);
      });
    } catch {
      finish();
      return;
    }

    safetyTimeout = window.setTimeout(finish, 500);

    return () => {
      if (safetyTimeout) window.clearTimeout(safetyTimeout);
      unsubscribe?.();
    };
  }, []);

  if (!hasHydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return <>{children}</>;
}
