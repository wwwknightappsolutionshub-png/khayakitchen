import { api } from "@/lib/api-client";
import type {
  LoyaltyAccount,
  LoyaltyPackage,
  LoyaltyPackageProgress,
  LoyaltySettings,
  Customer,
} from "@/lib/types";

export const loyaltyService = {
  async getProgram() {
    return api.get<{
      settings: LoyaltySettings;
      packages: LoyaltyPackage[];
      analytics: {
        members_active: number;
        members_eligible: number;
        members_total: number;
        points_outstanding: number;
        stamps_outstanding: number;
        referrals_credited: number;
        packages_active: number;
        free_until?: string | null;
      };
      members: Array<{
        account: LoyaltyAccount;
        customer: { id: string; name: string; phone?: string; email?: string } | null;
      }>;
    }>("/loyalty/program");
  },

  async updateSettings(payload: Partial<LoyaltySettings>) {
    return api.patch<{ settings: LoyaltySettings }>("/loyalty/settings", payload);
  },

  async createPackage(payload: Partial<LoyaltyPackage> & { name: string; package_type: string; goal_value: number; reward_type: string; reward_label: string }) {
    return api.post<{ package: LoyaltyPackage }>("/loyalty/packages", payload);
  },

  async updatePackage(id: string, payload: Partial<LoyaltyPackage>) {
    return api.patch<{ package: LoyaltyPackage }>(`/loyalty/packages/${id}`, payload);
  },

  async deletePackage(id: string) {
    return api.delete<{ deleted: boolean }>(`/loyalty/packages/${id}`);
  },

  async notifyQualified(audience?: string) {
    return api.post<{ notified: number }>("/loyalty/notify-qualified", { audience });
  },

  async getAccount(customerId: string): Promise<{ loyalty: LoyaltyAccount }> {
    return api.get<{ loyalty: LoyaltyAccount }>(`/loyalty/${customerId}`);
  },

  async getCustomerAccount(customerId: string, phone: string) {
    return api.get<{
      loyalty: LoyaltyAccount;
      completed_orders: number;
      can_opt_in: boolean;
      packages: LoyaltyPackage[];
      progress: LoyaltyPackageProgress[];
      enrollments_paused: boolean;
    }>("/customer/loyalty/" + customerId, {
      skipAuth: true,
      params: { phone },
    });
  },

  async optIn(customerId: string, phone: string) {
    return api.post<{ loyalty: LoyaltyAccount }>(
      "/customer/loyalty/opt-in",
      { customer_id: customerId, phone },
      { skipAuth: true },
    );
  },

  async claimInstall(customerId: string, phone: string, email?: string) {
    return api.post<{
      loyalty: LoyaltyAccount;
      customer: Customer;
      points_awarded: number;
      already_claimed: boolean;
      welcome_email_sent: boolean;
    }>(
      "/customer/loyalty/claim-install",
      {
        customer_id: customerId,
        phone,
        email: email || undefined,
      },
      { skipAuth: true },
    );
  },

  async redeem(customerId: string, points: number) {
    return api.post("/loyalty/redeem", { customer_id: customerId, points });
  },

  /** Logged-in customer redeem via session (X-Customer-Session auto-injected). */
  async redeemAsCustomer(points: number) {
    return api.post<{ loyalty: LoyaltyAccount }>(
      "/customer/loyalty/redeem",
      { points },
      { skipAuth: true },
    );
  },
};
