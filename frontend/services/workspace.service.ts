import { api } from "@/lib/api-client";
import type { TenantWorkspace } from "@/lib/types";

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
};
