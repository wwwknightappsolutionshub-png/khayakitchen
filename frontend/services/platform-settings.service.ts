import { api } from "@/lib/api-client";
import type { PlatformSettings } from "@/lib/types";

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
};
