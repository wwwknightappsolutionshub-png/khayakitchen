"use client";

import { useEffect } from "react";
import { disableServiceWorkers } from "@/lib/pwa";
import { BOOT_RELOAD_KEY } from "@/lib/pwa-boot-gate";

export function PwaLifecycle() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    const cleanupServiceWorkers = async () => {
      if (sessionStorage.getItem(BOOT_RELOAD_KEY) === "1") return;
      await disableServiceWorkers();
    };

    void cleanupServiceWorkers();
  }, []);

  return null;
}
