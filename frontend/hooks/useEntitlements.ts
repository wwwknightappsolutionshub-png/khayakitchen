"use client";

import { useQuery } from "@tanstack/react-query";
import { pricingService } from "@/services/pricing.service";
import { useAuthStore } from "@/stores/auth-store";

export function useEntitlements() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  const query = useQuery({
    queryKey: ["entitlements"],
    queryFn: () => pricingService.getEntitlements(),
    enabled: isAuthenticated,
    staleTime: 60_000,
  });

  const flags = query.data?.flags ?? {};
  const limits = query.data?.limits;
  const usage = query.data?.usage;
  const plan = query.data?.plan ?? null;
  const subscription = query.data?.subscription ?? null;
  const isEnabled = (module: string) => flags[module] !== false;

  return {
    flags,
    limits,
    usage,
    plan,
    subscription,
    isEnabled,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}
