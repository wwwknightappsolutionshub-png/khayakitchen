import { api } from "@/lib/api-client";
import type { Order } from "@/lib/types";

export const kitchenService = {
  async getActiveOrders(): Promise<{ orders: Order[] }> {
    return api.get<{ orders: Order[] }>("/kitchen/orders");
  },

  async updateOrderStatus(id: string, status: string): Promise<{ order: Order }> {
    return api.patch<{ order: Order }>(`/kitchen/orders/${id}`, { status });
  },
};
