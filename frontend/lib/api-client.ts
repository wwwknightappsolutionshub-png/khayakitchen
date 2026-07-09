import type { ApiError } from "./types";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

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

function getStoredTenantId(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("khayaos_tenant_id") ?? process.env.NEXT_PUBLIC_TENANT_ID ?? null;
}

function getStoredTenantSlug(): string | null {
  if (typeof window === "undefined") return process.env.NEXT_PUBLIC_TENANT_SLUG ?? null;
  return localStorage.getItem("khayaos_tenant_slug") ?? process.env.NEXT_PUBLIC_TENANT_SLUG ?? null;
}

export function setAuthToken(token: string | null) {
  if (typeof window === "undefined") return;
  if (token) {
    localStorage.setItem("khayaos_token", token);
  } else {
    localStorage.removeItem("khayaos_token");
  }
}

export function setTenantId(tenantId: string | null) {
  if (typeof window === "undefined") return;
  if (tenantId) {
    localStorage.setItem("khayaos_tenant_id", tenantId);
  } else {
    localStorage.removeItem("khayaos_tenant_id");
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

  if (!skipAuth) {
    const token = getStoredToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  const isPlatformRoute = endpoint.startsWith("/platform");
  const isAuthLoginRoute = endpoint === "/auth/login";
  const isPublicSignupRoute = endpoint === "/signup";
  const isPublicPricingRoute = endpoint === "/pricing/plans";

  if (!isPlatformRoute && !isAuthLoginRoute && !isPublicSignupRoute && !isPublicPricingRoute) {
    const tenantId = getStoredTenantId();
    if (tenantId) headers["X-Tenant-ID"] = tenantId;

    const tenantSlug = getStoredTenantSlug();
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

  if (!skipAuth) {
    const token = getStoredToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  if (!endpoint.startsWith("/platform") && endpoint !== "/signup" && endpoint !== "/pricing/plans") {
    const tenantId = getStoredTenantId();
    if (tenantId) headers["X-Tenant-ID"] = tenantId;
    const tenantSlug = getStoredTenantSlug();
    if (tenantSlug) headers["X-Tenant-Slug"] = tenantSlug;
  }

  const response = await fetch(url.toString(), {
    ...fetchOptions,
    method: "POST",
    headers,
    body: formData,
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

  return response.json() as Promise<T>;
}
