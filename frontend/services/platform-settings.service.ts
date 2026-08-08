import { api } from "@/lib/api-client";
import type {
  PlatformSettings,
  PlatformWhatsAppQueueFlushResult,
  PlatformWhatsAppQueueStatus,
  PlatformWhatsAppSettings,
} from "@/lib/types";

export const platformSettingsService = {
  async getPublicConfig(): Promise<PlatformSettings> {
    return api.get<PlatformSettings>("/platform/public-config", { skipAuth: true });
  },

  async getSettings(): Promise<{ settings: PlatformSettings }> {
    return api.get<{ settings: PlatformSettings }>("/platform/settings");
  },

  async updateSettings(payload: Partial<PlatformSettings>): Promise<{ settings: PlatformSettings }> {
    return api.patch<{ settings: PlatformSettings }>("/platform/settings", payload);
  },

  async uploadLogo(file: File): Promise<{ settings: PlatformSettings }> {
    const formData = new FormData();
    formData.append("image", file);
    return api.upload<{ settings: PlatformSettings }>("/platform/settings/logo", formData);
  },

  async uploadSplashImage(file: File): Promise<{ settings: PlatformSettings }> {
    const formData = new FormData();
    formData.append("image", file);
    return api.upload<{ settings: PlatformSettings }>("/platform/settings/splash-image", formData);
  },

  async uploadOgImage(file: File): Promise<{ settings: PlatformSettings }> {
    const formData = new FormData();
    formData.append("image", file);
    return api.upload<{ settings: PlatformSettings }>("/platform/settings/og-image", formData);
  },

  async getWhatsApp(): Promise<{ whatsapp: PlatformWhatsAppSettings }> {
    return api.get<{ whatsapp: PlatformWhatsAppSettings }>("/platform/whatsapp");
  },

  async updateWhatsApp(payload: {
    enabled?: boolean;
    provider?: "genius" | "meta" | "twilio";
    api_key?: string | null;
    session_id?: string | null;
    base_url?: string | null;
    meta_phone_number_id?: string | null;
    meta_access_token?: string | null;
    twilio_account_sid?: string | null;
    twilio_auth_token?: string | null;
    twilio_from?: string | null;
  }): Promise<{ whatsapp: PlatformWhatsAppSettings }> {
    return api.patch<{ whatsapp: PlatformWhatsAppSettings }>("/platform/whatsapp", payload);
  },

  async sendWhatsAppTest(payload: {
    phone: string;
    message?: string;
  }): Promise<{
    sent: boolean;
    phone: string;
    provider: string;
    source: string;
    message: string;
    error?: string;
  }> {
    return api.post("/platform/whatsapp/test", payload);
  },

  async getWhatsAppQueue(includeMixed = false): Promise<{ queue: PlatformWhatsAppQueueStatus }> {
    const qs = includeMixed ? "?include_mixed=1" : "";
    return api.get<{ queue: PlatformWhatsAppQueueStatus }>(`/platform/whatsapp/queue${qs}`);
  },

  async flushWhatsAppQueue(payload?: {
    include_failed?: boolean;
    include_mixed?: boolean;
  }): Promise<{ flush: PlatformWhatsAppQueueFlushResult; queue: PlatformWhatsAppQueueStatus }> {
    return api.post<{ flush: PlatformWhatsAppQueueFlushResult; queue: PlatformWhatsAppQueueStatus }>(
      "/platform/whatsapp/queue/flush",
      {
        include_failed: payload?.include_failed ?? true,
        include_mixed: payload?.include_mixed ?? false,
      },
    );
  },
};
