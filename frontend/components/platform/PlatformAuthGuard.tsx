"use client";

import { useEffect, useLayoutEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/auth-store";

const PLATFORM_ROLES = new Set(["super_admin", "platform_admin", "platform_support"]);

function redirectToLogin() {
  window.location.replace(`/login?from=platform&_t=${Date.now()}`);
}

export function PlatformAuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const hasHydrated = useAuthStore((s) => s.hasHydrated);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const user = useAuthStore((s) => s.user);
  const [hydrationTimedOut, setHydrationTimedOut] = useState(false);
  const [showManualLink, setShowManualLink] = useState(false);
  const isPlatformStaff = isAuthenticated && !!user?.role && PLATFORM_ROLES.has(user.role);

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

    if (!user?.role || !PLATFORM_ROLES.has(user.role)) {
      router.replace("/admin/dashboard");
    }
  }, [ready, isAuthenticated, user?.role, router]);

  if (!ready) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#0a0c10]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-violet-500 border-t-transparent" />
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
