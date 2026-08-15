"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ClipboardList } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { TableRowSkeleton } from "@/components/ui/LoadingSkeleton";
import { platformService } from "@/services/platform.service";
import { formatDate } from "@/lib/utils";
import { BackendPage } from "@/components/shared/BackendPage";
import { BACKEND_TABLE_CLASS, TableScroll } from "@/components/ui/TableScroll";

const PER_PAGE = 25;

export default function PlatformAuditPage() {
  const [page, setPage] = useState(1);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["platform", "audit-logs", page, PER_PAGE],
    queryFn: () => platformService.getAuditLogs({ page, per_page: PER_PAGE }),
    placeholderData: (previous) => previous,
  });

  const logs = data?.logs ?? [];
  const meta = data?.meta;
  const currentPage = meta?.current_page ?? page;
  const lastPage = meta?.last_page ?? 1;
  const total = meta?.total ?? 0;
  const from = total === 0 ? 0 : (currentPage - 1) * (meta?.per_page ?? PER_PAGE) + 1;
  const to = Math.min(currentPage * (meta?.per_page ?? PER_PAGE), total);

  return (
    <BackendPage>
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
        <TableScroll>
          <table className={BACKEND_TABLE_CLASS}>
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
                  <td className="px-4 py-3 text-muted max-w-xs truncate" title={log.reason ?? undefined}>
                    {log.reason ?? "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableScroll>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3">
          <p className="text-xs text-violet-300/60">
            {total === 0
              ? "No entries"
              : `Showing ${from}–${to} of ${total}${isFetching && !isLoading ? "…" : ""}`}
          </p>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="secondary"
              disabled={currentPage <= 1 || isFetching}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </Button>
            <span className="text-xs text-muted tabular-nums">
              Page {currentPage} / {lastPage}
            </span>
            <Button
              size="sm"
              variant="secondary"
              disabled={currentPage >= lastPage || isFetching}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      </Card>
    </BackendPage>
  );
}
