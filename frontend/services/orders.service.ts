import { api } from "@/lib/api-client";
import type { AccountRow, CreateOrderPayload, CreateOrderResponse, Order } from "@/lib/types";

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

  async getAccounts(): Promise<{ accounts: AccountRow[] }> {
    return api.get<{ accounts: AccountRow[] }>("/accounts");
  },

  async verifyAccountPayment(orderId: string): Promise<{ account: AccountRow }> {
    return api.post<{ account: AccountRow }>(`/accounts/${orderId}/verify`);
  },
};
