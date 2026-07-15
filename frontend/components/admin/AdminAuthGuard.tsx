"use client";

import { useEffect, useLayoutEffect, useState } from "react";
import { useAuthStore } from "@/stores/auth-store";
import {
  hasStaffAuthToken,
  useAuthPersistReady,
  useAuthSessionRecovery,
} from "@/hooks/useAuthPersistReady";

function redirectToLogin() {
  window.location.replace(`/login?from=admin&_t=${Date.now()}`);
}

function redirectPlatform(path: string) {
  window.location.replace(path);
}

export function AdminAuthGuard({ children }: { children: React.ReactNode }) {
  const ready = useAuthPersistReady();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const user = useAuthStore((s) => s.user);
  const [showManualLink, setShowManualLink] = useState(false);
  // Sync on first client paint — do not wait for useEffect (that raced redirects).
  const [tokenHint] = useState(() => hasStaffAuthToken());
  const recovering = useAuthSessionRecovery(ready && tokenHint && !isAuthenticated);

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

    if (user?.role === "super_admin") {
      redirectPlatform("/platform/dashboard");
      return;
    }

    if (user?.role === "platform_admin" || user?.role === "platform_support") {
      redirectPlatform("/platform/inbox");
    }
  }, [canDecide, isAuthenticated, user?.role]);

  if (!canDecide) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-3 bg-background px-6 text-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        {showManualLink ? (
          <a href={`/login?from=admin&_t=${Date.now()}`} className="text-sm font-medium text-primary underline">
            Continue to sign in
          </a>
        ) : null}
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-3 bg-background px-6 text-center">
        <p className="text-sm text-muted">Redirecting to sign in…</p>
        {showManualLink ? (
          <a href={`/login?from=admin&_t=${Date.now()}`} className="text-sm font-medium text-primary underline">
            Continue to sign in
          </a>
        ) : (
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        )}
      </div>
    );
  }

  if (
    user?.role === "super_admin" ||
    user?.role === "platform_admin" ||
    user?.role === "platform_support"
  ) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return <>{children}</>;
}
