"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { registerNetworkOnlyServiceWorker } from "@/lib/pwa";
import { BOOT_RELOAD_KEY } from "@/lib/pwa-boot-gate";
import {
  bindPwaInstallPromptCapture,
  clearDeferredInstallPrompt,
  inferPwaSurface,
} from "@/lib/pwa-install";

/**
 * Register the surface-scoped network-only SW:
 * - Ops → /ops/sw.js (scope /ops/)
 * - Customer → /sw.js (scope /)
 */
export function PwaLifecycle() {
  const pathname = usePathname() || "/";
  const surfaceRef = useRef(inferPwaSurface(pathname));

  useEffect(() => {
    if (typeof window === "undefined") return;

    bindPwaInstallPromptCapture();

    const surface = inferPwaSurface(pathname);
    if (surfaceRef.current !== surface) {
      // Drop cross-surface beforeinstallprompt so Order never installs Ops (and vice versa).
      clearDeferredInstallPrompt();
      surfaceRef.current = surface;
    }

    const boot = async () => {
      if (sessionStorage.getItem(BOOT_RELOAD_KEY) === "1") return;
      await registerNetworkOnlyServiceWorker(surface);
    };

    void boot();
  }, [pathname]);

  return null;
}
