import { api } from "@/lib/api-client";
import type { CrmStrategicAnalytics, Customer } from "@/lib/types";

export const crmService = {
  async getCustomers(): Promise<{ customers: Customer[] }> {
    return api.get<{ customers: Customer[] }>("/customers");
  },

  async getCustomer(id: string): Promise<{ customer: Customer }> {
    return api.get<{ customer: Customer }>(`/customers/${id}`);
  },

  async updateTags(id: string, tagIds: string[]): Promise<{ tags: string[] }> {
    return api.post<{ tags: string[] }>(`/customers/${id}/tags`, { tag_ids: tagIds });
  },

  async getInsights() {
    return api.get<import("@/lib/types").CrmInsights>("/customers/insights");
  },

  async getStrategicAnalytics(from: string, to: string): Promise<CrmStrategicAnalytics> {
    return api.get<CrmStrategicAnalytics>("/customers/analytics", {
      params: { from, to },
    });
  },
};
