import { api } from "@/lib/api-client";
import type {
  RevenueRecoveryCampaign,
  RevenueRecoveryDashboard,
  TenantRevenueRecoverySettings,
  ProximityBaitTier,
} from "@/lib/types";

export type CreateRevenueRecoveryCampaignPayload = {
  name: string;
  campaign_type: RevenueRecoveryCampaign["campaign_type"];
  discount_type: RevenueRecoveryCampaign["discount_type"];
  discount_value: number;
  meal_ids: string[];
  starts_at: string;
  ends_at: string;
  notifications_enabled?: boolean;
  notification_title?: string;
  notification_message?: string;
  target_audience?: RevenueRecoveryCampaign["target_audience"];
  proximity_bait_tiers?: ProximityBaitTier[];
  redemption_limit?: number | null;
};

export const revenueRecoveryService = {
  async getDashboard(): Promise<RevenueRecoveryDashboard> {
    return api.get<RevenueRecoveryDashboard>("/revenue-recovery/dashboard");
  },

  async listCampaigns(status?: string): Promise<{ campaigns: RevenueRecoveryCampaign[] }> {
    return api.get<{ campaigns: RevenueRecoveryCampaign[] }>("/revenue-recovery/campaigns", {
      params: status ? { status } : undefined,
    });
  },

  async getCampaign(id: string): Promise<{ campaign: RevenueRecoveryCampaign }> {
    return api.get<{ campaign: RevenueRecoveryCampaign }>(`/revenue-recovery/campaigns/${id}`);
  },

  async createCampaign(payload: CreateRevenueRecoveryCampaignPayload) {
    return api.post<{ campaign: RevenueRecoveryCampaign }>("/revenue-recovery/campaigns", payload);
  },

  async updateCampaign(id: string, payload: Partial<CreateRevenueRecoveryCampaignPayload>) {
    return api.patch<{ campaign: RevenueRecoveryCampaign }>(
      `/revenue-recovery/campaigns/${id}`,
      payload,
    );
  },

  async duplicateCampaign(id: string) {
    return api.post<{ campaign: RevenueRecoveryCampaign }>(
      `/revenue-recovery/campaigns/${id}/duplicate`,
    );
  },

  async activateCampaign(id: string) {
    return api.post<{ campaign: RevenueRecoveryCampaign }>(
      `/revenue-recovery/campaigns/${id}/activate`,
    );
  },

  async pauseCampaign(id: string) {
    return api.post<{ campaign: RevenueRecoveryCampaign }>(`/revenue-recovery/campaigns/${id}/pause`);
  },

  async resumeCampaign(id: string) {
    return api.post<{ campaign: RevenueRecoveryCampaign }>(`/revenue-recovery/campaigns/${id}/resume`);
  },

  async deactivateCampaign(id: string) {
    return api.post<{ campaign: RevenueRecoveryCampaign }>(
      `/revenue-recovery/campaigns/${id}/deactivate`,
    );
  },

  async archiveCampaign(id: string) {
    return api.post<{ campaign: RevenueRecoveryCampaign }>(
      `/revenue-recovery/campaigns/${id}/archive`,
    );
  },

  async deleteCampaign(id: string) {
    return api.delete(`/revenue-recovery/campaigns/${id}`);
  },

  async sendNotification(id: string) {
    return api.post<{ campaign: RevenueRecoveryCampaign }>(
      `/revenue-recovery/campaigns/${id}/notify`,
    );
  },

  async trackCampaignOpen(id: string) {
    return api.post<{ recorded: boolean }>(
      `/storefront/revenue-recovery/campaigns/${id}/track-open`,
    );
  },

  async getSettings(): Promise<{ settings: TenantRevenueRecoverySettings }> {
    return api.get<{ settings: TenantRevenueRecoverySettings }>("/revenue-recovery/settings");
  },

  async updateSettings(payload: {
    geofence_radius_km?: number;
    kitchen_address_text?: string;
    proximity_bait_tiers?: ProximityBaitTier[];
  }) {
    return api.patch<{ settings: TenantRevenueRecoverySettings }>(
      "/revenue-recovery/settings",
      payload,
    );
  },
};
