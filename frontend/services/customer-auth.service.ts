import { api } from "@/lib/api-client";
import type {
  Customer,
  CustomerAddress,
  CustomMealRequest,
  LoyaltyAccount,
  LoyaltyPackage,
  LoyaltyPackageProgress,
  Order,
} from "@/lib/types";

const SESSION_KEY = "khayaos-customer-session";

export const customerAuthService = {
  getSessionToken(): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(SESSION_KEY);
  },

  setSessionToken(token: string | null) {
    if (typeof window === "undefined") return;
    if (token) localStorage.setItem(SESSION_KEY, token);
    else localStorage.removeItem(SESSION_KEY);
  },

  sessionHeaders(): Record<string, string> {
    const token = this.getSessionToken();
    return token ? { "X-Customer-Session": token } : {};
  },

  async requestOtp(payload: {
    phone: string;
    email?: string;
    name?: string;
    mode?: "signin" | "signup";
  }) {
    return api.post<{ sent: boolean; channel: string; expires_in_seconds: number }>(
      "/customer/auth/request-otp",
      payload,
      { skipAuth: true },
    );
  },

  async verifyOtp(payload: { phone: string; otp: string; email?: string }) {
    const result = await api.post<{
      session_token: string;
      expires_at: string;
      customer: Customer;
    }>("/customer/auth/verify-otp", payload, { skipAuth: true });
    this.setSessionToken(result.session_token);
    if (result.customer.id) localStorage.setItem("khayaos-customer-id", result.customer.id);
    if (result.customer.phone) localStorage.setItem("khayaos-customer-phone", result.customer.phone);
    if (result.customer.name) localStorage.setItem("khayaos-customer-name", result.customer.name);
    if (result.customer.email) localStorage.setItem("khayaos-customer-email", result.customer.email);
    return result;
  },

  async logout() {
    try {
      await api.post(
        "/customer/auth/logout",
        {},
        { skipAuth: true, headers: this.sessionHeaders() },
      );
    } finally {
      this.setSessionToken(null);
    }
  },

  async me() {
    return api.get<{
      customer: Customer;
      loyalty: {
        loyalty: LoyaltyAccount;
        completed_orders: number;
        can_opt_in: boolean;
        packages: LoyaltyPackage[];
        progress: LoyaltyPackageProgress[];
        install_claim_eligible?: boolean;
        install_claim_points?: number;
        enrollments_paused?: boolean;
      } | null;
      referral: {
        token: string;
        menu_url: string;
        points_credit: number;
        stamp_credit: number;
      } | null;
      orders: Order[];
      addresses: CustomerAddress[];
      app_installed: boolean;
      install_claim: {
        eligible: boolean;
        points: number;
        app_installed: boolean;
        claimed: boolean;
      };
    }>("/customer/account/me", { skipAuth: true, headers: this.sessionHeaders() });
  },

  async updateMe(payload: { name?: string; email?: string }) {
    return api.patch<{ customer: Customer }>("/customer/account/me", payload, {
      skipAuth: true,
      headers: this.sessionHeaders(),
    });
  },

  async requestPhoneChange(phone: string) {
    return api.post(
      "/customer/account/phone/request-otp",
      { phone },
      { skipAuth: true, headers: this.sessionHeaders() },
    );
  },

  async confirmPhoneChange(phone: string, otp: string) {
    return api.post<{ customer: Customer }>(
      "/customer/account/phone/confirm",
      { phone, otp },
      { skipAuth: true, headers: this.sessionHeaders() },
    );
  },

  async listAddresses() {
    return api.get<{ addresses: CustomerAddress[] }>("/customer/account/addresses", {
      skipAuth: true,
      headers: this.sessionHeaders(),
    });
  },

  async saveAddress(payload: Partial<CustomerAddress>, id?: string) {
    if (id) {
      return api.patch<{ address: CustomerAddress }>(
        `/customer/account/addresses/${id}`,
        payload,
        { skipAuth: true, headers: this.sessionHeaders() },
      );
    }
    return api.post<{ address: CustomerAddress }>("/customer/account/addresses", payload, {
      skipAuth: true,
      headers: this.sessionHeaders(),
    });
  },

  async deleteAddress(id: string) {
    return api.delete(`/customer/account/addresses/${id}`, {
      skipAuth: true,
      headers: this.sessionHeaders(),
    });
  },

  async redeem(points: number) {
    return api.post<{ loyalty: LoyaltyAccount }>(
      "/customer/loyalty/redeem",
      { points },
      { skipAuth: true, headers: this.sessionHeaders() },
    );
  },

  async submitCustomMeal(payload: { title?: string; message: string; constraints?: string }) {
    return api.post<{ request: CustomMealRequest }>(
      "/customer/account/custom-meals",
      payload,
      { skipAuth: true, headers: this.sessionHeaders() },
    );
  },

  async myCustomMeals() {
    return api.get<{ requests: CustomMealRequest[] }>("/customer/account/custom-meals", {
      skipAuth: true,
      headers: this.sessionHeaders(),
    });
  },

  async getNotificationPreferences() {
    return api.get<{
      preferences: {
        push_enabled: boolean;
        whatsapp_enabled: boolean;
        email_enabled: boolean;
        phone?: string;
      };
    }>("/customer/account/notifications", {
      skipAuth: true,
      headers: this.sessionHeaders(),
    });
  },

  async updateNotificationPreferences(payload: {
    push_enabled?: boolean;
    whatsapp_enabled?: boolean;
    email_enabled?: boolean;
  }) {
    return api.patch("/customer/account/notifications", payload, {
      skipAuth: true,
      headers: this.sessionHeaders(),
    });
  },
};
