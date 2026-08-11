import type { ApiError } from "./types";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

const STAFF_TENANT_SLUG_KEY = "khayaos_tenant_slug";
const STAFF_TENANT_ID_KEY = "khayaos_tenant_id";
const ORDERING_TENANT_SLUG_KEY = "khayaos_ordering_tenant_slug";
const ORDERING_TENANT_ID_KEY = "khayaos_ordering_tenant_id";

export class ApiClientError extends Error {
  code: string;
  status: number;
  details?: Record<string, unknown>;

  constructor(message: string, code: string, status: number, details?: Record<string, unknown>) {
    super(message);
    this.name = "ApiClientError";
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

type RequestOptions = RequestInit & {
  params?: Record<string, string | undefined>;
  skipAuth?: boolean;
};

function getStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("khayaos_token");
}

export function getToken(): string | null {
  return getStoredToken();
}

function getStaffTenantId(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(STAFF_TENANT_ID_KEY);
}

function getStaffTenantSlug(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(STAFF_TENANT_SLUG_KEY);
}

export function getOrderingTenantSlug(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(ORDERING_TENANT_SLUG_KEY);
}

export function getOrderingTenantId(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(ORDERING_TENANT_ID_KEY);
}

/** True for guest/storefront APIs that must follow /r/{slug}, not staff workspace. */
export function isCustomerFacingEndpoint(endpoint: string): boolean {
  if (endpoint.startsWith("/storefront")) return true;
  if (endpoint.startsWith("/customer/")) return true;
  if (endpoint === "/menu" || endpoint.startsWith("/menu?")) return true;
  if (endpoint.startsWith("/realtime/public-config")) return true;
  if (endpoint.startsWith("/realtime/order-status/")) return true;
  return false;
}

function resolveTenantHeaders(endpoint: string): { tenantId: string | null; tenantSlug: string | null } {
  if (isCustomerFacingEndpoint(endpoint)) {
    const orderingSlug = getOrderingTenantSlug();
    if (orderingSlug) {
      return {
        tenantSlug: orderingSlug,
        // Prefer slug alone so a stale staff UUID cannot fight the shared link.
        tenantId: getOrderingTenantId(),
      };
    }
    // Cold open of `/` with no /r/{slug} yet — optional demo default only.
    // Never fall back to staff auth workspace (that caused cart kitchen switches).
    return {
      tenantId: null,
      tenantSlug: process.env.NEXT_PUBLIC_TENANT_SLUG ?? null,
    };
  }

  return {
    tenantId: getStaffTenantId() ?? process.env.NEXT_PUBLIC_TENANT_ID ?? null,
    tenantSlug: getStaffTenantSlug() ?? process.env.NEXT_PUBLIC_TENANT_SLUG ?? null,
  };
}

export function setAuthToken(token: string | null) {
  if (typeof window === "undefined") return;
  if (token) {
    localStorage.setItem("khayaos_token", token);
  } else {
    localStorage.removeItem("khayaos_token");
  }
}

/** Staff/admin workspace only — never touches shared ordering bind. */
export function setTenantId(tenantId: string | null) {
  if (typeof window === "undefined") return;
  if (tenantId) {
    localStorage.setItem(STAFF_TENANT_ID_KEY, tenantId);
  } else {
    localStorage.removeItem(STAFF_TENANT_ID_KEY);
  }
}

/** Staff/admin workspace only — never touches shared ordering bind. */
export function setTenantSlug(tenantSlug: string | null) {
  if (typeof window === "undefined") return;
  if (tenantSlug) {
    localStorage.setItem(STAFF_TENANT_SLUG_KEY, tenantSlug);
  } else {
    localStorage.removeItem(STAFF_TENANT_SLUG_KEY);
  }
}

/** Bind customer ordering session to a shared /r/{slug} workspace. */
export function bindOrderingTenant(tenantSlug: string, tenantId?: string | null) {
  if (typeof window === "undefined") return;
  const slug = tenantSlug.trim();
  if (!slug) return;
  localStorage.setItem(ORDERING_TENANT_SLUG_KEY, slug);
  if (tenantId) {
    localStorage.setItem(ORDERING_TENANT_ID_KEY, tenantId);
  } else {
    localStorage.removeItem(ORDERING_TENANT_ID_KEY);
  }
}

async function apiClient<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { params, skipAuth, headers: customHeaders, ...fetchOptions } = options;

  const url = new URL(`${API_URL}${endpoint}`);
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) url.searchParams.set(key, value);
    });
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
    ...(customHeaders as Record<string, string>),
  };

  const customerFacing = isCustomerFacingEndpoint(endpoint);
  // Staff tokens on another restaurant's storefront trip tenant.access (403).
  if (!skipAuth && !customerFacing) {
    const token = getStoredToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  if (customerFacing && typeof window !== "undefined") {
    const customerSession = localStorage.getItem("khayaos-customer-session");
    if (customerSession && !headers["X-Customer-Session"]) {
      headers["X-Customer-Session"] = customerSession;
    }
  }

  const isPlatformRoute = endpoint.startsWith("/platform");
  const isAuthLoginRoute = endpoint === "/auth/login";
  const isPublicAuthRoute =
    endpoint === "/auth/verify-email" ||
    endpoint === "/auth/resend-verification" ||
    endpoint === "/auth/forgot-password" ||
    endpoint === "/auth/reset-password";
  const isPublicSignupRoute =
    endpoint === "/signup" ||
    endpoint.startsWith("/signup/check-slug") ||
    endpoint.startsWith("/signup/check-email");
  const isPublicPricingRoute = endpoint === "/pricing/plans";
  const isMarketingRoute = endpoint.startsWith("/marketing/");

  if (
    !isPlatformRoute &&
    !isAuthLoginRoute &&
    !isPublicAuthRoute &&
    !isPublicSignupRoute &&
    !isPublicPricingRoute &&
    !isMarketingRoute
  ) {
    const { tenantId, tenantSlug } = resolveTenantHeaders(endpoint);
    if (tenantId) headers["X-Tenant-ID"] = tenantId;
    if (tenantSlug) headers["X-Tenant-Slug"] = tenantSlug;
  }

  const response = await fetch(url.toString(), {
    ...fetchOptions,
    headers,
  });

  if (!response.ok) {
    let errorBody: ApiError | null = null;
    try {
      errorBody = await response.json();
    } catch {
      // non-json error
    }
    throw new ApiClientError(
      errorBody?.message ?? `Request failed with status ${response.status}`,
      errorBody?.code ?? "REQUEST_FAILED",
      response.status,
      errorBody?.details as Record<string, unknown> | undefined,
    );
  }

  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export const api = {
  get: <T>(endpoint: string, options?: RequestOptions) =>
    apiClient<T>(endpoint, { ...options, method: "GET" }),

  post: <T>(endpoint: string, body?: unknown, options?: RequestOptions) =>
    apiClient<T>(endpoint, {
      ...options,
      method: "POST",
      body: body ? JSON.stringify(body) : undefined,
    }),

  put: <T>(endpoint: string, body?: unknown, options?: RequestOptions) =>
    apiClient<T>(endpoint, {
      ...options,
      method: "PUT",
      body: body ? JSON.stringify(body) : undefined,
    }),

  patch: <T>(endpoint: string, body?: unknown, options?: RequestOptions) =>
    apiClient<T>(endpoint, {
      ...options,
      method: "PATCH",
      body: body ? JSON.stringify(body) : undefined,
    }),

  delete: <T>(endpoint: string, options?: RequestOptions) =>
    apiClient<T>(endpoint, { ...options, method: "DELETE" }),

  upload: <T>(endpoint: string, formData: FormData, options?: Omit<RequestOptions, "headers">) =>
    uploadFormData<T>(endpoint, formData, options),
};

async function uploadFormData<T>(
  endpoint: string,
  formData: FormData,
  options: Omit<RequestOptions, "headers"> = {},
): Promise<T> {
  const { params, skipAuth, ...fetchOptions } = options;
  const url = new URL(`${API_URL}${endpoint}`);
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) url.searchParams.set(key, value);
    });
  }

  const headers: Record<string, string> = { Accept: "application/json" };
  const customerFacing = isCustomerFacingEndpoint(endpoint);

  if (!skipAuth && !customerFacing) {
    const token = getStoredToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  const isPlatformRoute = endpoint.startsWith("/platform");
  const isPublicSignupRoute =
    endpoint === "/signup" ||
    endpoint.startsWith("/signup/check-slug") ||
    endpoint.startsWith("/signup/check-email");
  const isPublicPricingRoute = endpoint === "/pricing/plans";
  const isMarketingRoute = endpoint.startsWith("/marketing/");

  if (!isPlatformRoute && !isPublicSignupRoute && !isPublicPricingRoute && !isMarketingRoute) {
    const { tenantId, tenantSlug } = resolveTenantHeaders(endpoint);
    if (tenantId) headers["X-Tenant-ID"] = tenantId;
    if (tenantSlug) headers["X-Tenant-Slug"] = tenantSlug;
  }

  let response: Response;
  try {
    response = await fetch(url.toString(), {
      ...fetchOptions,
      method: "POST",
      headers,
      body: formData,
    });
  } catch (error) {
    const detail =
      error instanceof Error && error.message && error.message !== "Failed to fetch"
        ? ` (${error.message})`
        : "";
    throw new ApiClientError(
      `Could not reach the server. Check your connection and try again.${detail}`,
      "NETWORK_ERROR",
      0,
    );
  }

  if (!response.ok) {
    let errorBody: (ApiError & {
      errors?: Record<string, string[] | string>;
      details?: Record<string, string[] | string | unknown>;
    }) | null = null;
    try {
      errorBody = await response.json();
    } catch {
      // non-json error
    }

    const validationBag = errorBody?.errors ?? errorBody?.details;
    let message = errorBody?.message ?? `Request failed with status ${response.status}`;
    if (validationBag && typeof validationBag === "object") {
      const first = Object.values(validationBag)
        .flatMap((value) => (Array.isArray(value) ? value : [value]))
        .find((value) => typeof value === "string" && value.trim());
      if (typeof first === "string") {
        message = first;
      }
    }

    throw new ApiClientError(
      message,
      errorBody?.code ?? "REQUEST_FAILED",
      response.status,
      (errorBody?.details ?? errorBody?.errors) as Record<string, unknown> | undefined,
    );
  }

  return response.json() as Promise<T>;
}
