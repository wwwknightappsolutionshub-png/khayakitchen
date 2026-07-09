"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/stores/auth-store";

export function AuthHydration({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const markReady = () => {
      useAuthStore.getState().setHasHydrated(true);
      setReady(true);
    };

    const safetyTimeout = window.setTimeout(markReady, 2000);

    if (useAuthStore.persist.hasHydrated()) {
      markReady();
      window.clearTimeout(safetyTimeout);
      return;
    }

    const unsubscribe = useAuthStore.persist.onFinishHydration(() => {
      markReady();
      window.clearTimeout(safetyTimeout);
    });

    return () => {
      window.clearTimeout(safetyTimeout);
      unsubscribe();
    };
  }, []);

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return <>{children}</>;
}
