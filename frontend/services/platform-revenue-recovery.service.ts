import { api } from "@/lib/api-client";
import type { TenantRevenueRecoverySettings } from "@/lib/types";

export type UpdatePlatformRevenueRecoveryPayload = {
  time_based_enabled?: boolean;
  proximity_enabled?: boolean;
  geofence_radius_km?: number;
  tenant_can_edit_radius?: boolean;
  kitchen_address_text?: string;
  proximity_bait_tiers?: TenantRevenueRecoverySettings["proximity_bait_tiers"];
  max_daily_proximity_pushes_per_customer?: number;
  location_accuracy_max_meters?: number;
};

export const platformRevenueRecoveryService = {
  async listTenants(): Promise<{ tenants: TenantRevenueRecoverySettings[] }> {
    return api.get<{ tenants: TenantRevenueRecoverySettings[] }>(
      "/platform/revenue-recovery/tenants",
    );
  },

  async getTenant(tenantId: string): Promise<TenantRevenueRecoverySettings> {
    return api.get<TenantRevenueRecoverySettings>(
      `/platform/revenue-recovery/tenants/${tenantId}`,
    );
  },

  async updateTenant(tenantId: string, payload: UpdatePlatformRevenueRecoveryPayload) {
    return api.patch<{ settings: TenantRevenueRecoverySettings }>(
      `/platform/revenue-recovery/tenants/${tenantId}`,
      payload,
    );
  },
};
