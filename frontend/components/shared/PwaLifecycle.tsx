"use client";

import { useEffect } from "react";
import { registerNetworkOnlyServiceWorker } from "@/lib/pwa";
import { BOOT_RELOAD_KEY } from "@/lib/pwa-boot-gate";
import { bindPwaInstallPromptCapture } from "@/lib/pwa-install";

export function PwaLifecycle() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    bindPwaInstallPromptCapture();

    const boot = async () => {
      if (sessionStorage.getItem(BOOT_RELOAD_KEY) === "1") return;
      await registerNetworkOnlyServiceWorker();
    };

    void boot();
  }, []);

  return null;
}
