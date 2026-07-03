"use client";

import { useQuery } from "@tanstack/react-query";
import { featureFlagsService } from "@/services/feature-flags.service";
import { pricingService } from "@/services/pricing.service";
import { useAuthStore } from "@/stores/auth-store";
import type { FeatureFlags } from "@/lib/types";

const DEFAULT_FLAGS: FeatureFlags = {
  menu: true,
  orders: true,
  inventory: true,
  kitchen: true,
  crm: true,
  loyalty: true,
  dashboard: true,
  notifications: true,
  "notifications.campaigns": true,
  "notifications.whatsapp": true,
  delivery: false,
  reporting: true,
};

export function useFeatureFlags() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  const query = useQuery({
    queryKey: ["entitlements"],
    queryFn: () => pricingService.getEntitlements(),
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  const fallback = useQuery({
    queryKey: ["feature-flags"],
    queryFn: () => featureFlagsService.getFlags(),
    enabled: isAuthenticated && !!query.error,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  const flags: FeatureFlags = query.data?.flags ?? fallback.data?.flags ?? DEFAULT_FLAGS;

  const isEnabled = (module: string): boolean => flags[module] !== false;

  return {
    flags,
    limits: query.data?.limits,
    isEnabled,
    isLoading: query.isLoading,
    error: query.error,
  };
}

