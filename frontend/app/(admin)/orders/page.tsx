"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Button } from "@/components/ui/Button";
import { BackendPage } from "@/components/shared/BackendPage";
import { TableRowSkeleton } from "@/components/ui/LoadingSkeleton";
import { BACKEND_TABLE_CLASS, TableScroll } from "@/components/ui/TableScroll";
import { MobileDataCard, ResponsiveDataView } from "@/components/ui/MobileDataCard";
import { ordersService } from "@/services/orders.service";
import { useAuth } from "@/hooks/useAuth";
import { formatCurrency, formatDate, cn } from "@/lib/utils";
import {
  dayKeyFromIso,
  formatDayHeading,
  getOrderAgeRowClass,
  getOrderAgeTone,
  todayKey,
} from "@/lib/order-age";
import type { Order } from "@/lib/types";

const statusFilters = [
  "pending",
  "accepted",
  "preparing",
  "ready",
  "completed",
  "cancelled",
  "undone",
  "all",
];

const OPEN = new Set(["pending", "accepted", "preparing", "ready"]);

export default function OrdersPage() {
  const { user } = useAuth();
  const [statusFilter, setStatusFilter] = useState("pending");
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [collapsedDays, setCollapsedDays] = useState<Record<string, boolean>>({});
  const queryClient = useQueryClient();

  useEffect(() => {
    const id = window.setInterval(() => setNowMs(Date.now()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["orders", statusFilter],
    queryFn: () =>
      ordersService.getOrders(statusFilter === "all" ? undefined : statusFilter),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      ordersService.updateStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["kitchen"] });
    },
  });

  const role = user?.role;
  const isFloor = role === "staff" || role === "owner" || role === "manager";
  const isManager = role === "owner" || role === "manager";

  const orders = Array.isArray(data?.orders) ? data.orders : [];
  const loadError =
    error instanceof Error ? error.message : isError ? "Failed to load orders." : null;

  const dayGroups = useMemo(() => {
    const map = new Map<string, Order[]>();
    for (const order of orders) {
      const key = dayKeyFromIso(order.created_at);
      const list = map.get(key) ?? [];
      list.push(order);
      map.set(key, list);
    }
    return Array.from(map.entries()).sort(([a], [b]) => b.localeCompare(a));
  }, [orders]);

  const today = todayKey();

  const isDayCollapsed = (day: string) => {
    if (day in collapsedDays) return collapsedDays[day];
    return day !== today;
  };

  const toggleDay = (day: string) => {
    setCollapsedDays((prev) => ({
      ...prev,
      [day]: !isDayCollapsed(day),
    }));
  };

  const orderActions = (order: Order) => (
    <div className="flex flex-wrap gap-2">
      {order.status === "pending" && isFloor && (
        <>
          <Button
            size="sm"
            onClick={() => updateMutation.mutate({ id: order.id, status: "accepted" })}
            disabled={updateMutation.isPending}
          >
            Accept
          </Button>
          <Button
            size="sm"
            variant="danger"
            onClick={() => updateMutation.mutate({ id: order.id, status: "cancelled" })}
            disabled={updateMutation.isPending}
          >
            Reject
          </Button>
        </>
      )}
      {order.status === "accepted" && isManager && (
        <Button
          size="sm"
          variant="secondary"
          onClick={() => updateMutation.mutate({ id: order.id, status: "preparing" })}
          disabled={updateMutation.isPending}
        >
          Preparing
        </Button>
      )}
      {order.status === "preparing" && isManager && (
        <Button
          size="sm"
          onClick={() => updateMutation.mutate({ id: order.id, status: "ready" })}
          disabled={updateMutation.isPending}
        >
          Ready
        </Button>
      )}
      {order.status === "ready" && isFloor && (
        <Button
          size="sm"
          onClick={() => updateMutation.mutate({ id: order.id, status: "completed" })}
          disabled={updateMutation.isPending}
        >
          Complete
        </Button>
      )}
    </div>
  );

  const ageClass = (order: Order) => {
    if (!OPEN.has(order.status)) return "";
    return getOrderAgeRowClass(getOrderAgeTone(order.created_at, nowMs));
  };

  return (
    <BackendPage>
      <header className="backend-header">
        <div>
          <h1 className="text-2xl font-bold">Orders</h1>
          <p className="text-sm text-muted">
            Floor accept → kitchen cook → floor complete · today stays open
          </p>
        </div>
      </header>

      <div className="mb-3 flex flex-wrap gap-3 text-xs text-muted">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-orange-500" /> &lt;5 min
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-red-500" /> 5–10 min
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-zinc-500" /> 10+ min
        </span>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {statusFilters.map((status) => (
          <button
            key={status}
            type="button"
            onClick={() => setStatusFilter(status)}
            className={cn(
              "rounded-full px-3 py-1.5 text-xs font-medium capitalize transition-colors",
              statusFilter === status
                ? "bg-primary text-white"
                : "bg-surface-elevated text-muted hover:text-foreground",
            )}
          >
            {status}
          </button>
        ))}
      </div>

      {loadError && (
        <div className="mb-4 rounded-[var(--radius)] border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger">
          <p>{loadError}</p>
          <button type="button" className="mt-2 underline" onClick={() => void refetch()}>
            Retry
          </button>
        </div>
      )}

      <div className="space-y-4">
        {isLoading && (
          <Card>
            <ResponsiveDataView
              mobile={<p className="py-6 text-center text-sm text-muted">Loading orders…</p>}
            >
              <TableScroll bordered={false}>
                <table className={BACKEND_TABLE_CLASS}>
                  <tbody>
                    {Array.from({ length: 5 }).map((_, i) => (
                      <TableRowSkeleton key={i} cols={9} />
                    ))}
                  </tbody>
                </table>
              </TableScroll>
            </ResponsiveDataView>
          </Card>
        )}

        {!isLoading && !loadError && orders.length === 0 && (
          <Card>
            <p className="px-4 py-8 text-center text-sm text-muted">No orders found</p>
          </Card>
        )}

        {dayGroups.map(([day, dayOrders]) => {
          const collapsed = isDayCollapsed(day);
          return (
            <Card key={day} className="overflow-hidden">
              <button
                type="button"
                onClick={() => toggleDay(day)}
                className="flex w-full items-center justify-between gap-3 border-b border-border px-4 py-3 text-left hover:bg-surface-elevated/40"
              >
                <div className="flex items-center gap-2">
                  {collapsed ? (
                    <ChevronRight className="h-4 w-4 text-muted" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-muted" />
                  )}
                  <span className="font-semibold">{formatDayHeading(day)}</span>
                  <span className="text-xs text-muted">{dayOrders.length} order(s)</span>
                </div>
                <span className="text-xs text-muted">{collapsed ? "Tucked away" : "Open"}</span>
              </button>

              {!collapsed && (
                <ResponsiveDataView
                  mobile={
                    <>
                      {dayOrders.map((order) => (
                        <MobileDataCard
                          key={order.id}
                          className={ageClass(order)}
                          title={`#${order.id.slice(0, 8).toUpperCase()}`}
                          subtitle={order.customer_name || "Guest"}
                          meta={<StatusBadge status={order.status} />}
                          rows={[
                            { label: "Phone", value: order.customer_phone || "—" },
                            { label: "Payment", value: order.payment_channel || "—" },
                            { label: "Type", value: order.order_type },
                            { label: "Total", value: formatCurrency(order.total_amount) },
                            { label: "Created", value: formatDate(order.created_at) },
                          ]}
                          actions={orderActions(order)}
                        />
                      ))}
                    </>
                  }
                >
                  <TableScroll bordered={false}>
                    <table className={BACKEND_TABLE_CLASS}>
                      <thead>
                        <tr className="border-b border-border text-left text-muted">
                          <th className="sticky top-0 bg-surface px-4 py-3 font-medium">Order</th>
                          <th className="sticky top-0 bg-surface px-4 py-3 font-medium">Customer</th>
                          <th className="sticky top-0 bg-surface px-4 py-3 font-medium">Phone</th>
                          <th className="sticky top-0 bg-surface px-4 py-3 font-medium">Payment</th>
                          <th className="sticky top-0 bg-surface px-4 py-3 font-medium">Type</th>
                          <th className="sticky top-0 bg-surface px-4 py-3 font-medium">Status</th>
                          <th className="sticky top-0 bg-surface px-4 py-3 font-medium">Total</th>
                          <th className="sticky top-0 bg-surface px-4 py-3 font-medium">Created</th>
                          <th className="sticky top-0 bg-surface px-4 py-3 font-medium">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {dayOrders.map((order) => (
                          <tr
                            key={order.id}
                            className={cn(
                              "border-b border-border transition-colors hover:bg-surface-elevated/50",
                              ageClass(order),
                            )}
                          >
                            <td className="px-4 py-3 font-mono text-xs">
                              #{order.id.slice(0, 8).toUpperCase()}
                            </td>
                            <td className="px-4 py-3">{order.customer_name || "Guest"}</td>
                            <td className="px-4 py-3 text-muted">
                              {order.customer_phone || "—"}
                            </td>
                            <td className="px-4 py-3 capitalize text-muted">
                              {order.payment_channel || "—"}
                            </td>
                            <td className="px-4 py-3 capitalize">{order.order_type}</td>
                            <td className="px-4 py-3">
                              <StatusBadge status={order.status} />
                            </td>
                            <td className="px-4 py-3 font-mono">
                              {formatCurrency(order.total_amount)}
                            </td>
                            <td className="px-4 py-3 text-muted">
                              {formatDate(order.created_at)}
                            </td>
                            <td className="px-4 py-3">{orderActions(order)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </TableScroll>
                </ResponsiveDataView>
              )}
            </Card>
          );
        })}
      </div>
    </BackendPage>
  );
}
