import { api, setAuthToken, setTenantId, setTenantSlug } from "@/lib/api-client";
import type { LoginResponse, User } from "@/lib/types";

const PLATFORM_ADMIN_EMAIL = "admin@khayaos.com";

export const authService = {
  async login(email: string, password: string, tenantSlug?: string): Promise<LoginResponse> {
    const isPlatformAdmin = email.trim().toLowerCase() === PLATFORM_ADMIN_EMAIL;

    const body: { email: string; password: string; tenant_slug?: string } = {
      email,
      password,
    };

    const normalizedTenantSlug = tenantSlug?.trim();
    if (!isPlatformAdmin && normalizedTenantSlug) {
      body.tenant_slug = normalizedTenantSlug;
    }

    const response = await api.post<LoginResponse>("/auth/login", body, { skipAuth: true });
    setAuthToken(response.token);
    setTenantId(response.user.tenant_id ?? null);
    setTenantSlug(response.user.tenant_slug ?? null);
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

  async updateEmail(email: string, currentPassword: string): Promise<User> {
    const response = await api.patch<{ user: User }>("/auth/email", {
      email,
      current_password: currentPassword,
    });
    return response.user;
  },

  async updatePassword(
    currentPassword: string,
    password: string,
    passwordConfirmation: string,
  ): Promise<void> {
    await api.patch("/auth/password", {
      current_password: currentPassword,
      password,
      password_confirmation: passwordConfirmation,
    });
  },

  async verifyEmail(token: string, email: string) {
    return api.post<{
      message: string;
      already_verified: boolean;
      tenant_slug?: string | null;
      email: string;
    }>("/auth/verify-email", { token, email }, { skipAuth: true });
  },

  async resendVerification(email: string, tenantSlug?: string) {
    return api.post<{ message: string }>(
      "/auth/resend-verification",
      { email, tenant_slug: tenantSlug?.trim() || undefined },
      { skipAuth: true },
    );
  },

  async forgotPassword(email: string, tenantSlug?: string) {
    return api.post<{ message: string }>(
      "/auth/forgot-password",
      { email, tenant_slug: tenantSlug?.trim() || undefined },
      { skipAuth: true },
    );
  },

  async resetPassword(
    email: string,
    token: string,
    password: string,
    passwordConfirmation: string,
    tenantSlug?: string,
  ) {
    return api.post<{ message: string; tenant_slug?: string | null; email: string }>(
      "/auth/reset-password",
      {
        email,
        token,
        password,
        password_confirmation: passwordConfirmation,
        tenant_slug: tenantSlug?.trim() || undefined,
      },
      { skipAuth: true },
    );
  },
};
