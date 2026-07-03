import { api } from "@/lib/api-client";
import type { CreateOrderPayload, CreateOrderResponse, Order } from "@/lib/types";

export const ordersService = {
  async getOrders(status?: string): Promise<{ orders: Order[] }> {
    return api.get<{ orders: Order[] }>("/orders", { params: { status } });
  },

  async createOrder(payload: CreateOrderPayload): Promise<CreateOrderResponse> {
    return api.post<CreateOrderResponse>("/orders", payload);
  },

  async updateStatus(id: string, status: string): Promise<{ order: Order }> {
    return api.patch<{ order: Order }>(`/orders/${id}/status`, { status });
  },

  async cancelOrder(id: string): Promise<{ order: Order }> {
    return api.post<{ order: Order }>(`/orders/${id}/cancel`);
  },
};
