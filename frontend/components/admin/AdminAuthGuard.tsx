"use client";

import { useEffect, useLayoutEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/auth-store";

function redirectToLogin() {
  const url = `/login?from=admin&_t=${Date.now()}`;
  window.location.replace(url);
}

export function AdminAuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const hasHydrated = useAuthStore((s) => s.hasHydrated);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const user = useAuthStore((s) => s.user);
  const [hydrationTimedOut, setHydrationTimedOut] = useState(false);
  const [showManualLink, setShowManualLink] = useState(false);

  useEffect(() => {
    if (hasHydrated) return;
    const timer = window.setTimeout(() => {
      useAuthStore.setState({ hasHydrated: true });
      setHydrationTimedOut(true);
    }, 800);
    return () => window.clearTimeout(timer);
  }, [hasHydrated]);

  const ready = hasHydrated || hydrationTimedOut;

  useLayoutEffect(() => {
    if (!ready) return;
    if (!isAuthenticated) {
      redirectToLogin();
    }
  }, [ready, isAuthenticated]);

  useEffect(() => {
    if (!ready || isAuthenticated) return;
    const timer = window.setTimeout(() => setShowManualLink(true), 1500);
    return () => window.clearTimeout(timer);
  }, [ready, isAuthenticated]);

  useEffect(() => {
    if (!ready) return;
    if (!isAuthenticated) return;

    if (user?.role === "super_admin") {
      router.replace("/platform/dashboard");
      return;
    }

    if (user?.role === "platform_admin" || user?.role === "platform_support") {
      router.replace("/platform/inbox");
    }
  }, [ready, isAuthenticated, user?.role, router]);

  if (!ready) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
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
