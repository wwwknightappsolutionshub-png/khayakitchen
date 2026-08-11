"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { getOrderingTenantSlug, getToken } from "@/lib/api-client";
import { OPS_PWA_INSTALLED_KEY, isStandaloneDisplay } from "@/lib/pwa-install";

/**
 * Heal poisoned Order installs that still open Ops login.
 * Installed Order chrome: Home is `/` (featured landing), Menu is `/menu`.
 * Never redirect `/` to `/menu`.
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

    if (
      (pathname === "/ops/login" || pathname === "/ops") &&
      !staffToken &&
      slug &&
      !hasOps
    ) {
      router.replace("/");
    }
  }, [pathname, router]);

  return null;
}
