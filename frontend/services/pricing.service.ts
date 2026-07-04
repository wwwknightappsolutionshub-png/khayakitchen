import { api } from "@/lib/api-client";
import type {
  Entitlements,
  PricingFeature,
  PricingPlan,
  PublicPricingPlan,
  TenantEntitlementsDetail,
  TenantSubscription,
  UpgradeRequest,
} from "@/lib/types";

export const pricingService = {
  async getPublicPlans(): Promise<{ public_pricing_enabled?: boolean; plans: PublicPricingPlan[] }> {
    return api.get("/pricing/plans", { skipAuth: true });
  },

  async getPlatformPlans(): Promise<{ plans: PricingPlan[] }> {
    return api.get("/platform/pricing/plans");
  },

  async getPlan(id: string): Promise<{ plan: PricingPlan }> {
    return api.get(`/platform/pricing/plans/${id}`);
  },

  async createPlan(payload: Partial<PricingPlan>) {
    return api.post<{ plan: PricingPlan }>("/platform/pricing/plans", payload);
  },

  async updatePlan(id: string, payload: Partial<PricingPlan>) {
    return api.put<{ plan: PricingPlan }>(`/platform/pricing/plans/${id}`, payload);
  },

  async deletePlan(id: string) {
    return api.delete<{ deleted: boolean }>(`/platform/pricing/plans/${id}`);
  },

  async archivePlan(id: string) {
    return api.post<{ plan: PricingPlan }>(`/platform/pricing/plans/${id}/archive`);
  },

  async restorePlan(id: string) {
    return api.post<{ plan: PricingPlan }>(`/platform/pricing/plans/${id}/restore`);
  },

  async duplicatePlan(id: string) {
    return api.post<{ plan: PricingPlan }>(`/platform/pricing/plans/${id}/duplicate`);
  },

  async reorderPlans(order: string[]) {
    return api.post<{ reordered: boolean }>("/platform/pricing/plans/reorder", { order });
  },

  async setPlanVisibility(id: string, is_visible: boolean) {
    return api.patch<{ plan: PricingPlan }>(`/platform/pricing/plans/${id}/visibility`, { is_visible });
  },

  async setPlanActive(id: string, is_active: boolean) {
    return api.patch<{ plan: PricingPlan }>(`/platform/pricing/plans/${id}/active`, { is_active });
  },

  async syncPlanFeatures(id: string, features: Record<string, boolean>) {
    return api.put<{ plan: PricingPlan }>(`/platform/pricing/plans/${id}/features`, { features });
  },

  async getFeatures(grouped = true): Promise<{
    features: Record<string, PricingFeature[]> | PricingFeature[];
  }> {
    return api.get("/platform/pricing/features", {
      params: { grouped: grouped ? "true" : "false" },
    });
  },

  async createFeature(payload: Omit<PricingFeature, "id">) {
    return api.post<{ feature: PricingFeature }>("/platform/pricing/features", payload);
  },

  async updateFeature(id: string, payload: Partial<PricingFeature>) {
    return api.put<{ feature: PricingFeature }>(`/platform/pricing/features/${id}`, payload);
  },

  async deleteFeature(id: string) {
    return api.delete<{ deleted: boolean }>(`/platform/pricing/features/${id}`);
  },

  async restoreFeature(id: string) {
    return api.post<{ feature: PricingFeature }>(`/platform/pricing/features/${id}/restore`);
  },

  async getSubscriptions(): Promise<{ subscriptions: TenantSubscription[] }> {
    return api.get("/platform/pricing/subscriptions");
  },

  async assignSubscription(payload: {
    tenant_id: string;
    plan_id: string;
    status?: string;
    billing_status?: string;
    reason?: string;
  }) {
    return api.post<{ subscription: TenantSubscription }>("/platform/pricing/subscriptions", payload);
  },

  async updateSubscriptionStatus(
    tenantId: string,
    payload: { status: string; billing_status?: string; reason?: string },
  ) {
    return api.patch<{ subscription: TenantSubscription }>(
      `/platform/pricing/subscriptions/${tenantId}/status`,
      payload,
    );
  },

  async listUpgradeRequests(status?: string): Promise<{ requests: UpgradeRequest[] }> {
    return api.get("/platform/pricing/upgrade-requests", {
      params: status ? { status } : undefined,
    });
  },

  async requestUpgrade(payload: { requested_plan_id?: string; message?: string }) {
    return api.post<{ request: UpgradeRequest }>("/entitlements/upgrade-request", payload);
  },

  async getEntitlements(): Promise<Entitlements> {
    return api.get<Entitlements>("/entitlements");
  },

  async getTenantEntitlements(tenantId: string): Promise<TenantEntitlementsDetail> {
    return api.get<TenantEntitlementsDetail>(`/platform/pricing/tenants/${tenantId}/entitlements`);
  },

  async setFeatureOverride(
    tenantId: string,
    payload: {
      feature_key: string;
      enabled: boolean;
      is_permanent?: boolean;
      expires_at?: string;
      reason?: string;
    },
  ) {
    return api.post(`/platform/pricing/tenants/${tenantId}/entitlements/features`, payload);
  },

  async setLimitOverride(
    tenantId: string,
    payload: {
      limit_key: string;
      value?: number | null;
      is_unlimited?: boolean;
      is_permanent?: boolean;
      expires_at?: string;
      reason?: string;
    },
  ) {
    return api.post(`/platform/pricing/tenants/${tenantId}/entitlements/limits`, payload);
  },

  async resetEntitlements(tenantId: string, reason?: string) {
    return api.post<{ reset: boolean }>(`/platform/pricing/tenants/${tenantId}/entitlements/reset`, {
      reason,
    });
  },
};
