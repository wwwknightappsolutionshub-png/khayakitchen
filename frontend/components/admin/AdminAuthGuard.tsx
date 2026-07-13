"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/auth-store";

export function AdminAuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const hasHydrated = useAuthStore((s) => s.hasHydrated);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const user = useAuthStore((s) => s.user);
  const [hydrationTimedOut, setHydrationTimedOut] = useState(false);

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
      // Full navigation — soft replace can leave this spinner on /login forever
      // when the PWA opens start_url /admin/dashboard as a guest.
      window.location.replace("/login");
      return;
    }

    if (user?.role === "super_admin") {
      router.replace("/platform/dashboard");
      return;
    }

    if (user?.role === "platform_admin" || user?.role === "platform_support") {
      router.replace("/platform/inbox");
    }
  }, [ready, isAuthenticated, user?.role, router]);

  if (
    !ready ||
    !isAuthenticated ||
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
