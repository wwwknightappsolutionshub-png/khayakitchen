import { api } from "@/lib/api-client";
import type { LoyaltyAccount } from "@/lib/types";

export const loyaltyService = {
  async getAccount(customerId: string): Promise<{ loyalty: LoyaltyAccount }> {
    return api.get<{ loyalty: LoyaltyAccount }>(`/loyalty/${customerId}`);
  },

  async redeem(customerId: string, points: number) {
    return api.post("/loyalty/redeem", { customer_id: customerId, points });
  },
};
