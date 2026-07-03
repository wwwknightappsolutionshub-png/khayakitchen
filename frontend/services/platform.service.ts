import { api } from "@/lib/api-client";
import type {
  PlatformDashboardOverview,
  PlatformModule,
  PlatformTenant,
  PlatformTenantFlags,
} from "@/lib/types";

export const platformService = {
  async getDashboard(): Promise<PlatformDashboardOverview> {
    return api.get<PlatformDashboardOverview>("/platform/dashboard");
  },

  async getModules(): Promise<{ modules: PlatformModule[] }> {
    return api.get<{ modules: PlatformModule[] }>("/platform/modules");
  },

  async getTenants(): Promise<{ tenants: PlatformTenant[] }> {
    return api.get<{ tenants: PlatformTenant[] }>("/platform/tenants");
  },

  async getFeatureFlags(): Promise<{ tenants: PlatformTenantFlags[] }> {
    return api.get<{ tenants: PlatformTenantFlags[] }>("/platform/feature-flags");
  },

  async updateTenantFlags(
    tenantId: string,
    flags: Record<string, boolean>,
  ): Promise<{ flags: Record<string, boolean> }> {
    return api.patch<{ flags: Record<string, boolean> }>(
      `/platform/feature-flags/${tenantId}`,
      { flags },
    );
  },

  async overrideRestaurantStatus(
    tenantId: string,
    payload: {
      status: "open" | "closing_soon" | "closed" | "promo_mode";
      promo_alerts_enabled?: boolean;
      reason?: string;
    },
  ) {
    return api.patch(`/platform/tenants/${tenantId}/restaurant-status`, payload);
  },
};
