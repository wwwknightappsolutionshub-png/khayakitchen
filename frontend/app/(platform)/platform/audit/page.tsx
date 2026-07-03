"use client";

import { useQuery } from "@tanstack/react-query";
import { ClipboardList } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { TableRowSkeleton } from "@/components/ui/LoadingSkeleton";
import { platformService } from "@/services/platform.service";
import { formatDate } from "@/lib/utils";

export default function PlatformAuditPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["platform", "audit-logs"],
    queryFn: () => platformService.getAuditLogs({ limit: 200 }),
  });

  const logs = data?.logs ?? [];

  return (
    <div className="animate-fade-in">
      <header className="mb-8">
        <div className="flex items-center gap-3">
          <ClipboardList className="h-7 w-7 text-violet-400" />
          <div>
            <h1 className="text-2xl font-bold text-violet-50">Platform Audit Logs</h1>
            <p className="text-sm text-violet-200/60">Cross-tenant actions and overrides</p>
          </div>
        </div>
      </header>

      <Card className="border-violet-500/15 bg-[#0f1117]">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-elevated/50 text-left text-muted">
                <th className="px-4 py-3 font-medium">Time</th>
                <th className="px-4 py-3 font-medium">Tenant</th>
                <th className="px-4 py-3 font-medium">Action</th>
                <th className="px-4 py-3 font-medium">Entity</th>
                <th className="px-4 py-3 font-medium">User</th>
                <th className="px-4 py-3 font-medium">Reason</th>
              </tr>
            </thead>
            <tbody>
              {isLoading &&
                Array.from({ length: 10 }).map((_, i) => <TableRowSkeleton key={i} cols={6} />)}
              {!isLoading && logs.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-muted">
                    No platform audit entries yet
                  </td>
                </tr>
              )}
              {logs.map((log) => (
                <tr
                  key={log.id}
                  className="border-b border-border last:border-0 hover:bg-surface-elevated/30"
                >
                  <td className="px-4 py-3 text-muted whitespace-nowrap">
                    {formatDate(log.created_at)}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">
                    {log.tenant_id ? log.tenant_id.slice(0, 8) : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant="outline">{log.action}</Badge>
                  </td>
                  <td className="px-4 py-3 text-muted">
                    {log.entity_type ?? "—"}
                    {log.entity_id && (
                      <span className="ml-1 font-mono text-xs">#{log.entity_id.slice(0, 8)}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">
                    {log.user_id ? log.user_id.slice(0, 8) : "—"}
                  </td>
                  <td className="px-4 py-3 text-muted max-w-xs truncate">
                    {log.reason ?? "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
