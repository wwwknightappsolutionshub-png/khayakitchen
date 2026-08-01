"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { registerNetworkOnlyServiceWorker } from "@/lib/pwa";
import { BOOT_RELOAD_KEY } from "@/lib/pwa-boot-gate";
import { bindPwaInstallPromptCapture, inferPwaSurface } from "@/lib/pwa-install";

/**
 * Register the surface-scoped network-only SW:
 * - Ops → /ops/sw.js (scope /ops/)
 * - Customer → /sw.js (scope /)
 */
export function PwaLifecycle() {
  const pathname = usePathname() || "/";

  useEffect(() => {
    if (typeof window === "undefined") return;

    bindPwaInstallPromptCapture();

    const boot = async () => {
      if (sessionStorage.getItem(BOOT_RELOAD_KEY) === "1") return;
      const surface = inferPwaSurface(pathname);
      await registerNetworkOnlyServiceWorker(surface);
    };

    void boot();
  }, [pathname]);

  return null;
}
