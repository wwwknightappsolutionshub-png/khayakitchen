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
      const pathname = window.location.pathname || "/";
      const staffOrAuthSurface =
        pathname === "/login" ||
        pathname === "/forgot-password" ||
        pathname === "/reset-password" ||
        pathname.startsWith("/verify-email") ||
        pathname.startsWith("/admin") ||
        pathname.startsWith("/platform") ||
        [
          "/orders",
          "/kitchen",
          "/inventory",
          "/crm",
          "/loyalty",
          "/inbox",
          "/reviews",
          "/seasonal-promo",
          "/marketing",
          "/revenue-recovery",
          "/branding",
          "/reports",
          "/staff-performance",
          "/settings",
        ].includes(pathname);

      if (staffOrAuthSurface && "serviceWorker" in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map((reg) => reg.unregister()));
        return;
      }
      await registerNetworkOnlyServiceWorker();
    };

    void boot();
  }, []);

  return null;
}
