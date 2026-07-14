"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Activity, BarChart3 } from "lucide-react";
import { BackendPage } from "@/components/shared/BackendPage";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/hooks/useAuth";
import { staffPerformanceService } from "@/services/staff-performance.service";
import { ApiClientError } from "@/lib/api-client";

function defaultFrom(): string {
  const d = new Date();
  d.setDate(d.getDate() - 6);
  return d.toISOString().slice(0, 10);
}

function defaultTo(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function StaffPerformancePage() {
  const { user } = useAuth();
  const canView = user?.role === "owner" || user?.role === "manager";
  const [from, setFrom] = useState(defaultFrom);
  const [to, setTo] = useState(defaultTo);
  const [role, setRole] = useState<"all" | "waiter" | "chef">("all");

  const query = useQuery({
    queryKey: ["staff-performance", from, to, role],
    queryFn: () =>
      staffPerformanceService.getOverview({
        from,
        to,
        role: role === "all" ? undefined : role,
      }),
    enabled: canView,
  });

  const maxTouched = useMemo(
    () => Math.max(1, ...(query.data?.daily.map((d) => d.orders_touched + d.waiter_orders) ?? [1])),
    [query.data?.daily],
  );

  if (!canView) {
    return (
      <BackendPage>
        <p className="text-sm text-muted">Only owners and managers can view staff performance.</p>
      </BackendPage>
    );
  }

  const errorMessage =
    query.error instanceof ApiClientError
      ? query.error.message
      : query.isError
        ? "Failed to load performance data."
        : null;

  return (
    <BackendPage>
      <header className="backend-header">
        <div className="flex items-center gap-3">
          <Activity className="h-7 w-7 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Staff performance</h1>
            <p className="text-sm text-muted">
              Waiter and chef activity with handle-time insights
              {query.data?.free_until
                ? ` · Free until ${query.data.free_until} for new workspaces`
                : ""}
            </p>
          </div>
        </div>
      </header>

      <div className="mb-6 flex flex-wrap items-end gap-3">
        <label className="text-sm">
          <span className="mb-1 block text-muted">From</span>
          <input
            type="date"
            className="h-10 rounded-[var(--radius)] border border-border bg-surface-elevated px-3 text-sm"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-muted">To</span>
          <input
            type="date"
            className="h-10 rounded-[var(--radius)] border border-border bg-surface-elevated px-3 text-sm"
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-muted">Role</span>
          <select
            className="h-10 rounded-[var(--radius)] border border-border bg-surface-elevated px-3 text-sm"
            value={role}
            onChange={(e) => setRole(e.target.value as "all" | "waiter" | "chef")}
          >
            <option value="all">All tracked roles</option>
            <option value="waiter">Waiters</option>
            <option value="chef">Chefs</option>
          </select>
        </label>
        <Button
          variant="secondary"
          onClick={() => query.refetch()}
          isLoading={query.isFetching}
        >
          Refresh
        </Button>
      </div>

      {errorMessage && (
        <p className="mb-4 rounded-[var(--radius)] bg-danger/10 px-3 py-2 text-sm text-danger">
          {errorMessage}
        </p>
      )}

      <Card className="mb-6">
        <CardHeader className="flex flex-row items-center gap-2">
          <BarChart3 className="h-5 w-5 text-primary" />
          <CardTitle>Daily activity</CardTitle>
        </CardHeader>
        <CardContent>
          {(query.data?.daily ?? []).length === 0 ? (
            <p className="text-sm text-muted">No order activity in this range yet.</p>
          ) : (
            <div className="space-y-3">
              {query.data!.daily.map((day) => {
                const total = day.orders_touched + day.waiter_orders;
                const width = (total / maxTouched) * 100;
                return (
                  <div key={day.date}>
                    <div className="mb-1 flex justify-between text-sm">
                      <span className="text-muted">{day.date}</span>
                      <span className="font-mono">
                        {day.waiter_orders} waiter · {day.orders_touched} kitchen touches
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-surface-elevated">
                      <div
                        className="h-full rounded-full bg-primary transition-all"
                        style={{ width: `${width}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        {(role === "all" || role === "waiter") && (
          <Card>
            <CardHeader>
              <CardTitle>Waiters</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {(query.data?.waiters ?? []).length === 0 && (
                <p className="text-sm text-muted">No waiter activity in this range.</p>
              )}
              {(query.data?.waiters ?? []).map((row) => (
                <div key={row.user_id} className="rounded-lg border border-border p-3 text-sm">
                  <p className="font-medium">{row.name}</p>
                  <p className="text-xs text-muted">{row.user_id}</p>
                  <p className="mt-2 text-muted">
                    {row.customers_served} customers · {row.orders_handled} orders ·{" "}
                    {row.completed_orders} completed
                    {row.avg_handle_minutes != null
                      ? ` · avg ${row.avg_handle_minutes} min`
                      : ""}
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {(role === "all" || role === "chef") && (
          <Card>
            <CardHeader>
              <CardTitle>Chefs</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {(query.data?.chefs ?? []).length === 0 && (
                <p className="text-sm text-muted">No kitchen activity in this range.</p>
              )}
              {(query.data?.chefs ?? []).map((row) => (
                <div key={row.user_id} className="rounded-lg border border-border p-3 text-sm">
                  <p className="font-medium">{row.name}</p>
                  <p className="text-xs text-muted">{row.user_id}</p>
                  <p className="mt-2 text-muted">
                    {row.customers_served} customers · {row.orders_handled} orders ·{" "}
                    {row.completed_orders} completed
                    {row.avg_handle_minutes != null
                      ? ` · avg accepted→completed ${row.avg_handle_minutes} min`
                      : ""}
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </BackendPage>
  );
}
