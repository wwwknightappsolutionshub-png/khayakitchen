import { api } from "@/lib/api-client";

export interface NotificationPreferencesPayload {
  phone: string;
  name?: string;
  push_enabled: boolean;
  whatsapp_enabled: boolean;
  email_enabled?: boolean;
}

export const customerNotificationsService = {
  async upsertPreferences(payload: NotificationPreferencesPayload) {
    return api.post<{
      customer_id: string;
      preferences: {
        push_enabled: boolean;
        whatsapp_enabled: boolean;
        email_enabled: boolean;
      };
    }>("/customer/notifications/preferences", payload, { skipAuth: true });
  },

  async registerDeviceToken(customerId: string, deviceToken: string) {
    return api.post("/customer/notifications/device-token", {
      customer_id: customerId,
      device_token: deviceToken,
      platform: "web",
    }, { skipAuth: true });
  },
};
