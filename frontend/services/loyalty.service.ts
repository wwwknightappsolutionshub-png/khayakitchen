import { api } from "@/lib/api-client";
import type { LoyaltyAccount } from "@/lib/types";

export const loyaltyService = {
  async getAccount(customerId: string): Promise<{ loyalty: LoyaltyAccount }> {
    return api.get<{ loyalty: LoyaltyAccount }>(`/loyalty/${customerId}`);
  },

  async getCustomerAccount(
    customerId: string,
    phone: string,
  ): Promise<{ loyalty: LoyaltyAccount }> {
    return api.get<{ loyalty: LoyaltyAccount }>(`/customer/loyalty/${customerId}`, {
      skipAuth: true,
      params: { phone },
    });
  },

  async redeem(customerId: string, points: number) {
    return api.post("/loyalty/redeem", { customer_id: customerId, points });
  },
};
