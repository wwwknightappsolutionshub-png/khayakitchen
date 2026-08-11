"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { getOrderingTenantSlug, getToken } from "@/lib/api-client";
import { OPS_PWA_INSTALLED_KEY, isStandaloneDisplay } from "@/lib/pwa-install";

/**
 * Heal poisoned / legacy Order installs that still open Ops login, and send
 * standalone Order launches from `/` straight to the kitchen menu.
 */
export function CustomerPwaLaunchRecovery() {
  const pathname = usePathname() || "/";
  const router = useRouter();

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!isStandaloneDisplay()) return;

    const slug = getOrderingTenantSlug();
    const hasOps = localStorage.getItem(OPS_PWA_INSTALLED_KEY) === "1";
    const staffToken = getToken();

    // Generic Order start_url `/` (or healed /manifest.json) → menu when tenant is bound.
    if ((pathname === "/" || pathname === "") && slug) {
      router.replace("/menu");
      return;
    }

    // Poisoned Order installs still open /ops/login until the OS refreshes start_url.
    // Stay on Ops login when this device is marked as an Ops app.
    if (
      (pathname === "/ops/login" || pathname === "/ops") &&
      !staffToken &&
      slug &&
      !hasOps
    ) {
      router.replace(`/r/${encodeURIComponent(slug)}`);
    }
  }, [pathname, router]);

  return null;
}
