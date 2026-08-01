"use client";

import { useEffect, useRef } from "react";
import { presenceService } from "@/services/presence.service";
import { detectPwaInstalled } from "@/lib/pwa-install";
import { useAuthStore } from "@/stores/auth-store";

const HEARTBEAT_MS = 45_000;

/**
 * Keeps Super Admin presence accurate while staff use the admin shell.
 * Also claims staff PWA install when running in standalone / installed mode.
 */
export function useStaffPresenceHeartbeat(enabled = true) {
  const user = useAuthStore((s) => s.user);
  const token = useAuthStore((s) => s.token);
  const claimedPwa = useRef(false);

  useEffect(() => {
    const isTenantStaff =
      !!user &&
      !!token &&
      !!user.tenant_id &&
      !["super_admin", "platform_support", "platform_admin"].includes(user.role);

    if (!enabled || !isTenantStaff) return;

    let cancelled = false;

    const beat = () => {
      if (cancelled || document.visibilityState === "hidden") return;
      void presenceService.heartbeat().catch(() => undefined);
    };

    const claimPwaIfInstalled = async () => {
      if (claimedPwa.current) return;
      const installed = await detectPwaInstalled("ops");
      if (!installed || cancelled) return;
      claimedPwa.current = true;
      void presenceService.claimStaffPwa().catch(() => {
        claimedPwa.current = false;
      });
    };

    beat();
    void claimPwaIfInstalled();

    const interval = window.setInterval(beat, HEARTBEAT_MS);
    const onVis = () => {
      if (document.visibilityState === "visible") beat();
    };
    document.addEventListener("visibilitychange", onVis);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [enabled, user, token]);
}
