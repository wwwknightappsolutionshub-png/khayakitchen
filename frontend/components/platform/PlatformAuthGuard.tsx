"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/auth-store";

const PLATFORM_ROLES = new Set(["super_admin", "platform_admin", "platform_support"]);

export function PlatformAuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const hasHydrated = useAuthStore((s) => s.hasHydrated);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const user = useAuthStore((s) => s.user);
  const [hydrationTimedOut, setHydrationTimedOut] = useState(false);
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

  useEffect(() => {
    if (!ready) return;

    if (!isAuthenticated) {
      // Full navigation so a stuck soft transition cannot leave a spinner on /login.
      window.location.replace("/login");
      return;
    }

    if (!user?.role || !PLATFORM_ROLES.has(user.role)) {
      router.replace("/admin/dashboard");
    }
  }, [ready, isAuthenticated, user?.role, router]);

  if (!ready || !isPlatformStaff) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#0a0c10]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-violet-500 border-t-transparent" />
      </div>
    );
  }

  return <>{children}</>;
}
