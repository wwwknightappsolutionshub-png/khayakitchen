import { api } from "@/lib/api-client";
import type { RestaurantOperationalStatus, Storefront, TenantBranding } from "@/lib/types";

export const tenantBrandingService = {
  async getStorefront(): Promise<Storefront> {
    return api.get<Storefront>("/storefront", { skipAuth: true });
  },

  async getBranding(): Promise<{ branding: TenantBranding }> {
    return api.get("/branding");
  },

  async updateBranding(payload: Partial<TenantBranding>) {
    return api.patch<{ branding: TenantBranding }>("/branding", payload);
  },

  async getRestaurantStatus() {
    return api.get<{ status: Storefront["status"] }>("/restaurant-status");
  },

  async updateRestaurantStatus(payload: {
    status: RestaurantOperationalStatus;
    promo_alerts_enabled?: boolean;
  }) {
    return api.patch<{ status: Storefront["status"] }>("/restaurant-status", payload);
  },
};
