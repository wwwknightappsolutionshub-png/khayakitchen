"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/auth-store";

export function AdminAuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const hasHydrated = useAuthStore((s) => s.hasHydrated);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    if (!hasHydrated) return;

    if (!isAuthenticated) {
      router.replace("/login");
      return;
    }

    if (user?.role === "super_admin") {
      router.replace("/platform/dashboard");
      return;
    }

    if (user?.role === "platform_admin" || user?.role === "platform_support") {
      router.replace("/platform/inbox");
    }
  }, [hasHydrated, isAuthenticated, user?.role, router]);

  if (
    !hasHydrated ||
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
