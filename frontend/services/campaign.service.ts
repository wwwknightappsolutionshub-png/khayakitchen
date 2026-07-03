import { api } from "@/lib/api-client";
import type { NotificationCampaign } from "@/lib/types";

export interface CreateCampaignPayload {
  title: string;
  message: string;
  type: "promo" | "announcement" | "info";
  channel: "pwa" | "whatsapp" | "both";
  target_audience: "all" | "repeat_customers" | "active_customers";
}

export const campaignService = {
  async listCampaigns(): Promise<{ campaigns: NotificationCampaign[] }> {
    return api.get<{ campaigns: NotificationCampaign[] }>("/campaigns");
  },

  async createCampaign(payload: CreateCampaignPayload): Promise<{ campaign: NotificationCampaign }> {
    return api.post<{ campaign: NotificationCampaign }>("/campaigns", payload);
  },

  async sendCampaign(id: string): Promise<{ campaign: NotificationCampaign }> {
    return api.post<{ campaign: NotificationCampaign }>(`/campaigns/${id}/send`);
  },
};
