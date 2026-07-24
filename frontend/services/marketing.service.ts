import { api } from "@/lib/api-client";

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
  ): Promise<{
    reply: string;
    suggest_whatsapp: boolean;
    whatsapp_url: string;
  }> {
    return api.post(
      "/marketing/chat",
      { message, history },
      { skipAuth: true },
    );
  },
};
