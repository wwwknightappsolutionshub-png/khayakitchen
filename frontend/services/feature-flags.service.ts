import { api } from "@/lib/api-client";
import type { FeatureFlags } from "@/lib/types";

export const featureFlagsService = {
  async getFlags(): Promise<{ flags: FeatureFlags }> {
    return api.get<{ flags: FeatureFlags }>("/feature-flags");
  },

  async updateFlags(flags: FeatureFlags): Promise<{ flags: FeatureFlags }> {
    return api.patch<{ flags: FeatureFlags }>("/feature-flags", { flags });
  },
};
