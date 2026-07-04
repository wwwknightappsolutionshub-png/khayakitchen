"use client";

import { useQuery } from "@tanstack/react-query";
import { ClipboardList } from "lucide-react";
import { BackendPage } from "@/components/shared/BackendPage";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { TableRowSkeleton } from "@/components/ui/LoadingSkeleton";
import { BACKEND_TABLE_CLASS, TableScroll } from "@/components/ui/TableScroll";
import { auditService } from "@/services/audit.service";
import { formatDate } from "@/lib/utils";

export default function AuditPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["audit-logs"],
    queryFn: () => auditService.getLogs(100),
  });

  const logs = data?.logs ?? [];

  return (
    <BackendPage>
      <header className="backend-header">
        <div className="flex items-center gap-3">
          <ClipboardList className="h-7 w-7 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Audit Logs</h1>
            <p className="text-sm text-muted">Recent actions across your restaurant</p>
          </div>
        </div>
      </header>

      <Card>
        <TableScroll bordered={false}>
          <table className={BACKEND_TABLE_CLASS}>
            <thead>
              <tr className="border-b border-border text-left text-muted">
                <th className="sticky top-0 bg-surface px-4 py-3 font-medium">Time</th>
                <th className="sticky top-0 bg-surface px-4 py-3 font-medium">Action</th>
                <th className="sticky top-0 bg-surface px-4 py-3 font-medium">Entity</th>
                <th className="sticky top-0 bg-surface px-4 py-3 font-medium">User</th>
                <th className="sticky top-0 bg-surface px-4 py-3 font-medium">Reason</th>
              </tr>
            </thead>
            <tbody>
              {isLoading &&
                Array.from({ length: 8 }).map((_, i) => <TableRowSkeleton key={i} cols={5} />)}
              {!isLoading && logs.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-muted">
                    No audit entries yet
                  </td>
                </tr>
              )}
              {logs.map((log) => (
                <tr
                  key={log.id}
                  className="border-b border-border transition-colors hover:bg-surface-elevated/50"
                >
                  <td className="px-4 py-3 text-muted whitespace-nowrap">
                    {formatDate(log.created_at)}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant="outline">{log.action}</Badge>
                  </td>
                  <td className="px-4 py-3 text-muted">
                    {log.entity_type ? (
                      <span>
                        {log.entity_type}
                        {log.entity_id && (
                          <span className="ml-1 font-mono text-xs">
                            #{log.entity_id.slice(0, 8)}
                          </span>
                        )}
                      </span>
                    ) : (
                      "—"
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
        </TableScroll>
      </Card>
    </BackendPage>
  );
}
