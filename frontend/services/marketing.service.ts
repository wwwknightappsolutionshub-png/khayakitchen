import { api } from "@/lib/api-client";

export type MarketingChatResponse = {
  reply: string;
  suggest_whatsapp: boolean;
  needs_email: boolean;
  handoff: boolean;
  confident: boolean;
  whatsapp_url: string;
};

export const marketingService = {
  async visitorHit(): Promise<{
    display_count: number;
    incremented: boolean;
    step: number;
  }> {
    return api.post("/marketing/visitor-hit", {}, { skipAuth: true });
  },

  async chat(
    message: string,
    history: { role: "user" | "assistant"; content: string }[] = [],
    email?: string,
  ): Promise<MarketingChatResponse> {
    return api.post(
      "/marketing/chat",
      { message, history, email: email || undefined },
      { skipAuth: true },
    );
  },
};
