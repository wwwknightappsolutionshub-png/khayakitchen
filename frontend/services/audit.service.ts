import { api } from "@/lib/api-client";
import type { AuditLogEntry } from "@/lib/types";

export const auditService = {
  async getLogs(limit = 50): Promise<{ logs: AuditLogEntry[] }> {
    return api.get<{ logs: AuditLogEntry[] }>("/audit-logs", {
      params: { limit: String(limit) },
    });
  },
};
