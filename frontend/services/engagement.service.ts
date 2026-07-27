import { api } from "@/lib/api-client";
import type {
  ChatMessage,
  ChatThread,
  KitchenReview,
  MealReferPayload,
  PlatformTenantMessage,
  User,
} from "@/lib/types";

export const engagementService = {
  listPlatformMessages(tenantId?: string) {
    return api.get<{ messages: PlatformTenantMessage[] }>("/platform/messages", {
      params: { tenant_id: tenantId },
    });
  },

  sendPlatformMessage(payload: {
    tenant_id: string;
    channel: "push" | "email";
    title: string;
    body: string;
  }) {
    return api.post<{ message: PlatformTenantMessage }>("/platform/messages", payload);
  },

  listPlatformChatThreads(tenantId?: string) {
    return api.get<{ threads: ChatThread[] }>("/platform/chat/threads", {
      params: { tenant_id: tenantId },
    });
  },

  openPlatformChat(tenantId: string, subject?: string) {
    return api.post<{ thread: ChatThread }>("/platform/chat/threads", {
      tenant_id: tenantId,
      subject,
    });
  },

  getPlatformChat(threadId: string) {
    return api.get<{ thread: ChatThread }>(`/platform/chat/threads/${threadId}`);
  },

  postPlatformChatMessage(threadId: string, body: string) {
    return api.post<{ message: ChatMessage }>(`/platform/chat/threads/${threadId}/messages`, {
      body,
    });
  },

  listPlatformStaff() {
    return api.get<{ users: User[] }>("/platform/staff");
  },

  createPlatformStaff(payload: {
    name: string;
    email: string;
    password: string;
    role: "platform_admin" | "platform_support";
  }) {
    return api.post<{ user: User }>("/platform/staff", payload);
  },

  listTenantPlatformMessages() {
    return api.get<{ messages: PlatformTenantMessage[] }>("/engagement/platform-messages");
  },

  listTenantPlatformThreads() {
    return api.get<{ threads: ChatThread[] }>("/engagement/platform-chat/threads");
  },

  listTenantCustomerThreads(activeOrdersOnly = false) {
    const qs = activeOrdersOnly ? "?active_orders=1" : "";
    return api.get<{ threads: ChatThread[] }>(`/engagement/customer-chat/threads${qs}`);
  },

  openTenantCustomerThread(customerId: string, subject?: string, orderId?: string) {
    return api.post<{ thread: ChatThread }>("/engagement/customer-chat/threads", {
      customer_id: customerId,
      subject,
      order_id: orderId,
    });
  },

  openTenantCustomerThreadForOrder(orderId: string) {
    return api.post<{ thread: ChatThread }>("/engagement/customer-chat/threads", {
      order_id: orderId,
    });
  },

  getTenantChat(threadId: string) {
    return api.get<{ thread: ChatThread }>(`/engagement/chat/threads/${threadId}`);
  },

  postTenantChatMessage(threadId: string, body: string) {
    return api.post<{ message: ChatMessage }>(`/engagement/chat/threads/${threadId}/messages`, {
      body,
    });
  },

  registerStaffDeviceToken(deviceToken: string, platform = "web") {
    return api.post("/engagement/staff-device-token", {
      device_token: deviceToken,
      platform,
    });
  },

  listReviews(status?: string) {
    return api.get<{ reviews: KitchenReview[] }>("/engagement/reviews", {
      params: { status },
    });
  },

  moderateReview(id: string, status: "approved" | "rejected") {
    return api.patch<{ review: KitchenReview }>(`/engagement/reviews/${id}`, { status });
  },

  toggleMealLike(mealId: string, payload: { phone?: string; guest_key?: string }) {
    return api.post<{ meal_id: string; liked: boolean; likes_count: number }>(
      `/customer/meals/${mealId}/like`,
      payload,
    );
  },

  getMealRefer(mealId: string, phone?: string) {
    return api.get<{ refer: MealReferPayload }>(`/customer/meals/${mealId}/refer`, {
      skipAuth: true,
      params: phone ? { phone } : undefined,
    });
  },

  submitReview(payload: { name: string; phone: string; body: string }) {
    return api.post<{ review: KitchenReview }>("/customer/reviews", payload);
  },

  openCustomerChat(payload: {
    phone?: string;
    guest_key?: string;
    name?: string;
    subject?: string;
  }) {
    return api.post<{ thread: ChatThread }>("/customer/chat/threads", payload);
  },

  getCustomerChat(threadId: string, identity: { phone?: string; guest_key?: string }) {
    return api.get<{ thread: ChatThread }>(`/customer/chat/threads/${threadId}`, {
      params: {
        phone: identity.phone,
        guest_key: identity.guest_key,
      },
    });
  },

  postCustomerChatMessage(
    threadId: string,
    identity: { phone?: string; guest_key?: string },
    body: string,
  ) {
    return api.post<{ message: ChatMessage }>(`/customer/chat/threads/${threadId}/messages`, {
      phone: identity.phone,
      guest_key: identity.guest_key,
      body,
    });
  },

  getNotificationBadges() {
    return api.get<{
      unread_customer_messages: number;
      unread_chat_threads: number;
      pending_reviews: number;
      pending_orders: number;
      kitchen_tickets: number;
      ready_awaiting_completion: number;
      crm_attention: number;
      dashboard_attention: number;
    }>("/engagement/notification-badges");
  },

  setCustomerChatTyping(
    threadId: string,
    identity: { phone?: string; guest_key?: string },
    isTyping: boolean,
  ) {
    return api.post(`/customer/chat/threads/${threadId}/typing`, {
      phone: identity.phone,
      guest_key: identity.guest_key,
      is_typing: isTyping,
    });
  },

  setTenantChatTyping(threadId: string, isTyping: boolean) {
    return api.post(`/engagement/chat/threads/${threadId}/typing`, {
      is_typing: isTyping,
    });
  },

  setPlatformChatTyping(threadId: string, isTyping: boolean) {
    return api.post(`/platform/chat/threads/${threadId}/typing`, {
      is_typing: isTyping,
    });
  },
};
