import { api } from "@/lib/api-client";
import type { Notification } from "@/lib/types";

export const notificationsService = {
  async getNotifications(): Promise<{ notifications: Notification[] }> {
    return api.get<{ notifications: Notification[] }>("/notifications");
  },

  async markAsRead(id: string): Promise<{ notification: Notification }> {
    return api.patch<{ notification: Notification }>(`/notifications/${id}/read`);
  },
};
