import { api } from "@/lib/api-client";
import type { CreateOrderPayload, CreateOrderResponse, Order } from "@/lib/types";

export type CustomerOrderPayload = CreateOrderPayload & {
  name: string;
  phone: string;
  payment_method?: "cash" | "card" | "transfer";
  email?: string;
  referral_token?: string;
};

export const customerOrdersService = {
  async createOrder(payload: CustomerOrderPayload): Promise<CreateOrderResponse & { customer_id?: string }> {
    return api.post<CreateOrderResponse & { customer_id?: string }>("/customer/orders", payload, {
      skipAuth: true,
    });
  },

  async getOrders(phone: string): Promise<{ orders: Order[]; customer_id?: string }> {
    return api.get<{ orders: Order[]; customer_id?: string }>("/customer/orders", {
      params: { phone },
      skipAuth: true,
    });
  },

  async getOrder(orderId: string, phone: string): Promise<{ order: Order }> {
    return api.get<{ order: Order }>(`/customer/orders/${orderId}`, {
      params: { phone },
      skipAuth: true,
    });
  },
};
