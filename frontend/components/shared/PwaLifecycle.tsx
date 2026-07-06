"use client";

import { useEffect } from "react";
import { disableServiceWorkers, runVersionGate } from "@/lib/pwa";

export function PwaLifecycle() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    const syncPwa = async () => {
      const resetTriggered = await runVersionGate();
      if (resetTriggered) return;
      await disableServiceWorkers();
    };

    void syncPwa();

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void syncPwa();
      }
    };

    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => document.removeEventListener("visibilitychange", onVisibilityChange);
  }, []);

  return null;
}
