import { api } from "@/lib/api-client";
import type { CustomerProximitySession, ProximityBaitPayload } from "@/lib/types";

const SESSION_STORAGE_KEY = "khayaos-customer-proximity-session";

export function readProximitySessionToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(SESSION_STORAGE_KEY);
}

export function writeProximitySessionToken(token: string | null): void {
  if (typeof window === "undefined") return;
  if (token) {
    localStorage.setItem(SESSION_STORAGE_KEY, token);
  } else {
    localStorage.removeItem(SESSION_STORAGE_KEY);
  }
}

function sessionHeaders(): Record<string, string> {
  const token = readProximitySessionToken();
  return token ? { "X-Customer-Session": token } : {};
}

export const customerProximityService = {
  async requestOtp(phone: string, email: string) {
    return api.post<{ sent: boolean; expires_in_seconds: number }>(
      "/customer/proximity/auth/request-otp",
      { phone, email },
    );
  },

  async verifyOtp(phone: string, email: string, otp: string): Promise<CustomerProximitySession> {
    const result = await api.post<CustomerProximitySession>(
      "/customer/proximity/auth/verify-otp",
      { phone, email, otp },
    );
    writeProximitySessionToken(result.session_token);
    return result;
  },

  async setLocationOptIn(locationOptIn: boolean) {
    return api.post<{ location_opt_in: boolean }>(
      "/customer/proximity/auth/location-opt-in",
      { location_opt_in: locationOptIn },
      { headers: sessionHeaders() },
    );
  },

  async sendHeartbeat(lat: number, lng: number, accuracyMeters?: number) {
    return api.post<{ stored: boolean; reason?: string }>(
      "/customer/proximity/location",
      {
        lat,
        lng,
        accuracy_meters: accuracyMeters,
      },
      { headers: sessionHeaders() },
    );
  },

  async fetchBait(lat: number, lng: number, accuracyMeters?: number) {
    return api.get<{ bait: ProximityBaitPayload | null }>("/customer/proximity/bait", {
      params: {
        lat: String(lat),
        lng: String(lng),
        accuracy_meters: accuracyMeters != null ? String(accuracyMeters) : undefined,
      },
      headers: sessionHeaders(),
    });
  },

  async dismiss(campaignId?: string, distanceKm?: number) {
    return api.post<{ dismissed: boolean }>(
      "/customer/proximity/dismiss",
      {
        campaign_id: campaignId,
        distance_km: distanceKm,
      },
      { headers: sessionHeaders() },
    );
  },

  clearSession() {
    writeProximitySessionToken(null);
  },
};
