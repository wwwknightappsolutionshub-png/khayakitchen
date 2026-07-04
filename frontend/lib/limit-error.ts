import { ApiClientError } from "@/lib/api-client";

export interface LimitErrorInfo {
  message: string;
  limitKey: string;
  currentUsage: number;
  maxAllowed: number;
  recommendedPlanId?: string;
  recommendedPlanName?: string;
}

function firstDetail(details: Record<string, unknown> | undefined, key: string): string | undefined {
  const value = details?.[key];
  if (Array.isArray(value) && value.length > 0) return String(value[0]);
  if (typeof value === "string") return value;
  return undefined;
}

export function parseLimitError(error: unknown): LimitErrorInfo | null {
  if (!(error instanceof ApiClientError)) return null;
  if (error.code !== "VALIDATION_ERROR") return null;

  const details = error.details as Record<string, unknown> | undefined;
  const limitKey = firstDetail(details, "limit_key");
  if (!limitKey) return null;

  const limitMessages = details?.limit;
  const message =
    (Array.isArray(limitMessages) && limitMessages[0]
      ? String(limitMessages[0])
      : error.message) || "You have reached your plan limit.";

  return {
    message,
    limitKey,
    currentUsage: Number(firstDetail(details, "current_usage") ?? 0),
    maxAllowed: Number(firstDetail(details, "max_allowed") ?? 0),
    recommendedPlanId: firstDetail(details, "recommended_plan_id") || undefined,
    recommendedPlanName: firstDetail(details, "recommended_plan_name") || undefined,
  };
}

export function formatLimitLabel(limitKey: string): string {
  return limitKey.replace(/^max_/, "").replace(/_/g, " ");
}
