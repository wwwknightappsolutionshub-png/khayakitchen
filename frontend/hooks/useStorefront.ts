import { useQuery } from "@tanstack/react-query";
import { tenantBrandingService } from "@/services/tenant-branding.service";

export function useStorefront() {
  return useQuery({
    queryKey: ["storefront"],
    queryFn: () => tenantBrandingService.getStorefront(),
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
}
