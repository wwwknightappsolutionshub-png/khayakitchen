import { api, setAuthToken, setTenantId } from "@/lib/api-client";
import type { LoginResponse, User } from "@/lib/types";

const PLATFORM_ADMIN_EMAIL = "admin@khayaos.com";

export const authService = {
  async login(email: string, password: string): Promise<LoginResponse> {
    const isPlatformAdmin = email.trim().toLowerCase() === PLATFORM_ADMIN_EMAIL;
    const tenantSlug = process.env.NEXT_PUBLIC_TENANT_SLUG ?? "pilot";

    const body: { email: string; password: string; tenant_slug?: string } = {
      email,
      password,
    };

    if (!isPlatformAdmin) {
      body.tenant_slug = tenantSlug;
    }

    const response = await api.post<LoginResponse>("/auth/login", body, { skipAuth: true });
    setAuthToken(response.token);
    setTenantId(response.user.tenant_id ?? null);
    return response;
  },

  async logout(): Promise<void> {
    try {
      await api.post("/auth/logout");
    } finally {
      setAuthToken(null);
    }
  },

  async me(): Promise<User> {
    return api.get<User>("/auth/me");
  },
};
