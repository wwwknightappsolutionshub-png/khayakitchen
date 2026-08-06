import { api } from "@/lib/api-client";
import type {
  AuditLogEntry,
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

  async createTenant(payload: {
    name: string;
    slug: string;
    logo_url?: string;
    primary_color?: string;
    owner_name?: string;
    owner_email?: string;
    owner_password?: string;
  }): Promise<{ tenant: PlatformTenant }> {
    return api.post<{ tenant: PlatformTenant }>("/platform/tenants", payload);
  },

  async updateTenant(
    tenantId: string,
    payload: {
      name?: string;
      slug?: string;
      logo_url?: string;
      primary_color?: string;
      status?: "active" | "suspended";
    },
  ): Promise<{ tenant: PlatformTenant }> {
    return api.put<{ tenant: PlatformTenant }>(`/platform/tenants/${tenantId}`, payload);
  },

  async deleteTenant(tenantId: string): Promise<{ deleted: boolean; mode?: string }> {
    return api.delete<{ deleted: boolean; mode?: string }>(`/platform/tenants/${tenantId}`);
  },

  async purgeTenant(
    tenantId: string,
    payload: { confirmation_slug: string; confirm: boolean },
  ): Promise<{ purged: boolean; tenant_id: string; slug: string }> {
    return api.post<{ purged: boolean; tenant_id: string; slug: string }>(
      `/platform/tenants/${tenantId}/purge`,
      payload,
    );
  },

  async pokeTenant(tenantId: string): Promise<{ message: unknown; channel: string }> {
    return api.post<{ message: unknown; channel: string }>(
      `/platform/tenants/${tenantId}/poke`,
    );
  },

  async getAuditLogs(params?: {
    limit?: number;
    tenant_id?: string;
  }): Promise<{ logs: AuditLogEntry[] }> {
    return api.get<{ logs: AuditLogEntry[] }>("/platform/audit-logs", {
      params: {
        limit: params?.limit ? String(params.limit) : undefined,
        tenant_id: params?.tenant_id,
      },
    });
  },

  async overrideBranding(
    tenantId: string,
    payload: {
      logo_url?: string;
      primary_color?: string;
      secondary_color?: string;
      accent_color?: string;
      banner_image?: string;
      ticker_enabled?: boolean;
      ticker_text?: string;
    },
  ) {
    return api.patch(`/platform/tenants/${tenantId}/branding`, payload);
  },

  async clearBrandingOverride(tenantId: string) {
    return api.delete(`/platform/tenants/${tenantId}/branding`);
  },

  async uploadTenantBrandingLogo(tenantId: string, file: File) {
    const formData = new FormData();
    formData.append("image", file);
    return api.upload(`/platform/tenants/${tenantId}/branding/logo`, formData);
  },

  async uploadTenantBrandingBanner(tenantId: string, file: File) {
    const formData = new FormData();
    formData.append("image", file);
    return api.upload(`/platform/tenants/${tenantId}/branding/banner`, formData);
  },
};
