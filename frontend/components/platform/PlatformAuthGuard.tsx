"use client";

import { useEffect, useLayoutEffect, useState } from "react";
import { useAuthStore } from "@/stores/auth-store";
import {
  hasStaffAuthToken,
  useAuthPersistReady,
  useAuthSessionRecovery,
} from "@/hooks/useAuthPersistReady";

const PLATFORM_ROLES = new Set(["super_admin", "platform_admin", "platform_support"]);

function redirectToLogin() {
  window.location.replace(`/login?from=platform&_t=${Date.now()}`);
}

export function PlatformAuthGuard({ children }: { children: React.ReactNode }) {
  const ready = useAuthPersistReady();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const user = useAuthStore((s) => s.user);
  const [showManualLink, setShowManualLink] = useState(false);
  const [tokenHint] = useState(() => hasStaffAuthToken());
  const recovering = useAuthSessionRecovery(ready && tokenHint && !isAuthenticated);
  const isPlatformStaff = isAuthenticated && !!user?.role && PLATFORM_ROLES.has(user.role);

  const waitingOnSession = (tokenHint && !isAuthenticated) || recovering;
  const canDecide = ready && !waitingOnSession;

  useLayoutEffect(() => {
    if (!canDecide) return;
    if (!isAuthenticated && !hasStaffAuthToken()) {
      redirectToLogin();
    }
  }, [canDecide, isAuthenticated]);

  useEffect(() => {
    if (canDecide && isAuthenticated) return;
    if (!ready) return;
    const timer = window.setTimeout(() => setShowManualLink(true), 2500);
    return () => window.clearTimeout(timer);
  }, [canDecide, isAuthenticated, ready]);

  useEffect(() => {
    if (!canDecide || !isAuthenticated) return;

    if (!user?.role || !PLATFORM_ROLES.has(user.role)) {
      window.location.replace("/admin/dashboard");
    }
  }, [canDecide, isAuthenticated, user?.role]);

  if (!canDecide) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-3 bg-[#0a0c10] px-6 text-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-violet-500 border-t-transparent" />
        {showManualLink ? (
          <a href={`/login?from=platform&_t=${Date.now()}`} className="text-sm font-medium text-violet-400 underline">
            Continue to sign in
          </a>
        ) : null}
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-3 bg-[#0a0c10] px-6 text-center">
        <p className="text-sm text-zinc-400">Redirecting to sign in…</p>
        {showManualLink ? (
          <a href={`/login?from=platform&_t=${Date.now()}`} className="text-sm font-medium text-violet-400 underline">
            Continue to sign in
          </a>
        ) : (
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-violet-500 border-t-transparent" />
        )}
      </div>
    );
  }

  if (!isPlatformStaff) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#0a0c10]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-violet-500 border-t-transparent" />
      </div>
    );
  }

  return <>{children}</>;
}
