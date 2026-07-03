import { api } from "@/lib/api-client";

export interface RealtimeConfig {
  driver: string;
  key: string;
  host: string;
  port: number;
  scheme: string;
  channels: {
    admin?: string;
    kitchen?: string;
    customer: string;
  };
  auth_endpoint: string;
  vapid_public_key?: string;
}

export interface RealtimeDashboardSummary {
  revenue_today: number;
  orders_today: number;
  pending_count: number;
  as_of: string;
}

export interface RealtimeOrderStatus {
  order_id: string;
  status: string;
  updated_at: string;
}

export interface RealtimeOrderUpdate {
  order_id: string;
  status: string;
  total_amount?: number;
  updated_at?: string;
}

export const realtimeService = {
  async getConfig(): Promise<RealtimeConfig> {
    return api.get<RealtimeConfig>("/realtime/config");
  },

  async getPublicConfig(): Promise<RealtimeConfig> {
    return api.get<RealtimeConfig>("/realtime/public-config", { skipAuth: true });
  },

  async getDashboardSummary(): Promise<RealtimeDashboardSummary> {
    return api.get<RealtimeDashboardSummary>("/realtime/dashboard-summary");
  },

  async getOrders(params?: { since?: string; since_iso?: string; channel?: string }) {
    return api.get<{
      cursor?: string;
      events?: unknown[];
      orders?: RealtimeOrderUpdate[];
      as_of?: string;
    }>("/realtime/orders", { params });
  },

  async getOrderStatus(orderId: string): Promise<RealtimeOrderStatus> {
    return api.get<RealtimeOrderStatus>(`/realtime/order-status/${orderId}`, {
      skipAuth: true,
    });
  },
};
