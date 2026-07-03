import { useQuery } from "@tanstack/react-query";
import { analyticsService } from "@/services/analytics.service";
import { tenantBrandingService } from "@/services/tenant-branding.service";
import { useHybridInterval } from "@/hooks/useHybridInterval";

export function useLiveDashboard() {
  const pollInterval = useHybridInterval(5_000, 15_000);

  const summary = useQuery({
    queryKey: ["analytics", "operations-summary"],
    queryFn: () => analyticsService.getOperationsSummary(),
    refetchInterval: pollInterval,
    staleTime: 5_000,
  });

  const status = useQuery({
    queryKey: ["restaurant-status"],
    queryFn: () => tenantBrandingService.getRestaurantStatus(),
    refetchInterval: pollInterval,
    staleTime: 5_000,
  });

  return { summary, status };
}
