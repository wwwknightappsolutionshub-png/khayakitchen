"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/auth-store";

export function PlatformAuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const hasHydrated = useAuthStore((s) => s.hasHydrated);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const user = useAuthStore((s) => s.user);

  const isPlatformAdmin = isAuthenticated && user?.role === "super_admin";

  useEffect(() => {
    if (!hasHydrated) return;

    if (!isAuthenticated) {
      router.replace("/login");
      return;
    }

    if (user?.role !== "super_admin") {
      router.replace("/admin/dashboard");
    }
  }, [hasHydrated, isAuthenticated, user?.role, router]);

  if (!hasHydrated || !isPlatformAdmin) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#0a0c10]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-violet-500 border-t-transparent" />
      </div>
    );
  }

  return <>{children}</>;
}
