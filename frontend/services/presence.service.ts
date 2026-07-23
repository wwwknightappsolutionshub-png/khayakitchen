import { api } from "@/lib/api-client";

export const presenceService = {
  heartbeat() {
    return api.post<{ last_seen_at: string; presence: string }>("/presence/heartbeat");
  },

  claimStaffPwa() {
    return api.post<{ pwa_installed_at: string; already_claimed: boolean }>(
      "/workspace/pwa-install",
    );
  },
};
