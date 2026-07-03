import { api } from "@/lib/api-client";
import type { Entitlements, PricingFeature, PricingPlan, TenantSubscription } from "@/lib/types";

export const pricingService = {
  async getPublicPlans(): Promise<{ demo_mode: boolean; plans: PricingPlan[] }> {
    return api.get("/pricing/plans", { skipAuth: true });
  },

  async getPlatformPlans(): Promise<{ plans: PricingPlan[] }> {
    return api.get("/platform/pricing/plans");
  },

  async createPlan(payload: Partial<PricingPlan>) {
    return api.post<{ plan: PricingPlan }>("/platform/pricing/plans", payload);
  },

  async updatePlan(id: string, payload: Partial<PricingPlan>) {
    return api.put<{ plan: PricingPlan }>(`/platform/pricing/plans/${id}`, payload);
  },

  async deletePlan(id: string) {
    return api.delete(`/platform/pricing/plans/${id}`);
  },

  async setPlanVisibility(id: string, is_visible: boolean) {
    return api.patch<{ plan: PricingPlan }>(`/platform/pricing/plans/${id}/visibility`, { is_visible });
  },

  async syncPlanFeatures(id: string, features: Record<string, boolean>) {
    return api.put<{ plan: PricingPlan }>(`/platform/pricing/plans/${id}/features`, { features });
  },

  async getFeatures(): Promise<{ features: Record<string, PricingFeature[]> }> {
    return api.get("/platform/pricing/features");
  },

  async createFeature(payload: Omit<PricingFeature, "id">) {
    return api.post("/platform/pricing/features", payload);
  },

  async getSubscriptions(): Promise<{ subscriptions: TenantSubscription[] }> {
    return api.get("/platform/pricing/subscriptions");
  },

  async assignSubscription(payload: {
    tenant_id: string;
    plan_id: string;
    status?: string;
    reason?: string;
  }) {
    return api.post("/platform/pricing/subscriptions", payload);
  },

  async updateSubscriptionStatus(tenantId: string, status: string, reason?: string) {
    return api.patch(`/platform/pricing/subscriptions/${tenantId}/status`, { status, reason });
  },

  async getEntitlements(): Promise<Entitlements> {
    return api.get<Entitlements>("/entitlements");
  },
};
