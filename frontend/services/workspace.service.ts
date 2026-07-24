import { api } from "@/lib/api-client";
import type { TenantWhatsAppSettings, TenantWorkspace } from "@/lib/types";

export const workspaceService = {
  async getWorkspace(): Promise<{ workspace: TenantWorkspace }> {
    return api.get<{ workspace: TenantWorkspace }>("/workspace");
  },

  async updateWorkspace(payload: {
    currency?: string;
    country?: string | null;
    country_iso?: string | null;
    timezone?: string | null;
    ui_theme?: "light" | "dark";
  }): Promise<{ workspace: TenantWorkspace }> {
    return api.patch<{ workspace: TenantWorkspace }>("/workspace", payload);
  },

  async getWhatsApp(): Promise<{ whatsapp: TenantWhatsAppSettings }> {
    return api.get<{ whatsapp: TenantWhatsAppSettings }>("/workspace/whatsapp");
  },

  async updateWhatsApp(payload: {
    enabled?: boolean;
    provider?: "meta" | "twilio";
    phone_number_id?: string | null;
    access_token?: string | null;
    twilio_account_sid?: string | null;
    twilio_auth_token?: string | null;
    twilio_from?: string | null;
  }): Promise<{ whatsapp: TenantWhatsAppSettings }> {
    return api.patch<{ whatsapp: TenantWhatsAppSettings }>("/workspace/whatsapp", payload);
  },
};
