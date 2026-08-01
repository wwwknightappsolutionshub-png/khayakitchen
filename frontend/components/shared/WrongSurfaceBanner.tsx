"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CUSTOMER_PWA_INSTALLED_KEY,
  OPS_PWA_INSTALLED_KEY,
  inferPwaSurface,
  isStandaloneDisplay,
} from "@/lib/pwa-install";
import { OPS_ROUTES } from "@/lib/ops-paths";

/**
 * When an installed PWA is opened on the opposite surface, nudge the user
 * toward the correct home (Order vs Ops).
 */
export function WrongSurfaceBanner() {
  const pathname = usePathname() || "/";
  const [show, setShow] = useState<false | "ops-on-customer" | "customer-on-ops">(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!isStandaloneDisplay()) {
      setShow(false);
      return;
    }
    try {
      const pathSurface = inferPwaSurface(pathname);
      const hasOps = localStorage.getItem(OPS_PWA_INSTALLED_KEY) === "1";
      const hasCustomer = localStorage.getItem(CUSTOMER_PWA_INSTALLED_KEY) === "1";
      if (hasOps && !hasCustomer && pathSurface === "customer") {
        setShow("ops-on-customer");
        return;
      }
      if (hasCustomer && !hasOps && pathSurface === "ops") {
        setShow("customer-on-ops");
        return;
      }
      setShow(false);
    } catch {
      setShow(false);
    }
  }, [pathname]);

  if (!show || dismissed) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-[400] border-t border-border bg-surface-elevated p-3 shadow-lg sm:bottom-4 sm:left-4 sm:right-auto sm:max-w-sm sm:rounded-xl sm:border">
      <p className="text-sm font-medium text-foreground">
        {show === "ops-on-customer"
          ? "You opened the Ops app on the customer menu."
          : "You opened the Order app on the kitchen workspace."}
      </p>
      <p className="mt-1 text-xs text-muted">
        {show === "ops-on-customer"
          ? "For ordering, use this kitchen’s Order app. For kitchen work, go to Ops."
          : "For kitchen work, open KhayaOS Ops. For ordering, use the restaurant Order app."}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {show === "ops-on-customer" ? (
          <Link
            href={OPS_ROUTES.orders}
            className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white"
            onClick={() => setDismissed(true)}
          >
            Go to Ops
          </Link>
        ) : (
          <Link
            href="/"
            className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white"
            onClick={() => setDismissed(true)}
          >
            Go to Order menu
          </Link>
        )}
        <button
          type="button"
          className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted"
          onClick={() => setDismissed(true)}
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}
