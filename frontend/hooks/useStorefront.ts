import { useQuery } from "@tanstack/react-query";
import { getOrderingTenantSlug } from "@/lib/api-client";
import { tenantBrandingService } from "@/services/tenant-branding.service";

export function useStorefront() {
  const orderingSlug =
    typeof window !== "undefined" ? getOrderingTenantSlug() : null;

  return useQuery({
    queryKey: ["storefront", orderingSlug ?? "default"],
    queryFn: () => tenantBrandingService.getStorefront(),
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
}
