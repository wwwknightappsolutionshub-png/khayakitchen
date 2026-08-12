import { api } from "@/lib/api-client";
import type { LoyaltyAccount, LoyaltyRedemptionVoucher, Order } from "@/lib/types";

export const kitchenService = {
  async getActiveOrders(): Promise<{ orders: Order[] }> {
    return api.get<{ orders: Order[] }>("/kitchen/orders");
  },

  async updateOrderStatus(id: string, status: string): Promise<{ order: Order }> {
    return api.patch<{ order: Order }>(`/kitchen/orders/${id}`, { status });
  },

  async getPendingVouchers(): Promise<{ vouchers: LoyaltyRedemptionVoucher[] }> {
    return api.get<{ vouchers: LoyaltyRedemptionVoucher[] }>("/kitchen/loyalty-vouchers");
  },

  async fulfilVoucher(id: string) {
    return api.post<{ voucher: LoyaltyRedemptionVoucher; loyalty: LoyaltyAccount }>(
      `/kitchen/loyalty-vouchers/${id}/fulfil`,
      {},
    );
  },

  async cancelVoucher(id: string) {
    return api.post<{ voucher: LoyaltyRedemptionVoucher; loyalty: LoyaltyAccount }>(
      `/kitchen/loyalty-vouchers/${id}/cancel`,
      {},
    );
  },
};
