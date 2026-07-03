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

    if (useAuthStore.persist.hasHydrated()) {
      markReady();
      return;
    }

    return useAuthStore.persist.onFinishHydration(markReady);
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
