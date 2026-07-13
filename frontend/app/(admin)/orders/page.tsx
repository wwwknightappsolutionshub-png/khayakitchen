"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Button } from "@/components/ui/Button";
import { BackendPage } from "@/components/shared/BackendPage";
import { TableRowSkeleton } from "@/components/ui/LoadingSkeleton";
import { BACKEND_TABLE_CLASS, TableScroll } from "@/components/ui/TableScroll";
import { MobileDataCard, ResponsiveDataView } from "@/components/ui/MobileDataCard";
import { ordersService } from "@/services/orders.service";
import { formatCurrency, formatDate, cn } from "@/lib/utils";

const statusFilters = ["all", "pending", "preparing", "ready", "completed", "cancelled"];

export default function OrdersPage() {
  const [statusFilter, setStatusFilter] = useState("all");
  const queryClient = useQueryClient();

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["orders", statusFilter],
    queryFn: () =>
      ordersService.getOrders(statusFilter === "all" ? undefined : statusFilter),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      ordersService.updateStatus(id, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["orders"] }),
  });

  const orders = Array.isArray(data?.orders) ? data.orders : [];
  const loadError =
    error instanceof Error ? error.message : isError ? "Failed to load orders." : null;

  const orderActions = (order: (typeof orders)[number]) => (
    <>
      {order.status === "pending" && (
        <Button
          size="sm"
          variant="secondary"
          onClick={() => updateMutation.mutate({ id: order.id, status: "preparing" })}
        >
          Start
        </Button>
      )}
      {order.status === "preparing" && (
        <Button
          size="sm"
          onClick={() => updateMutation.mutate({ id: order.id, status: "ready" })}
        >
          Ready
        </Button>
      )}
    </>
  );

  return (
    <BackendPage>
      <header className="backend-header">
        <div>
          <h1 className="text-2xl font-bold">Orders</h1>
          <p className="text-sm text-muted">Manage and update order status</p>
        </div>
      </header>

      <div className="mb-4 flex flex-wrap gap-2">
        {statusFilters.map((status) => (
          <button
            key={status}
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

      <Card>
        <ResponsiveDataView
          mobile={
            <>
              {isLoading && (
                <p className="py-6 text-center text-sm text-muted">Loading orders…</p>
              )}
              {!isLoading && !loadError && orders.length === 0 && (
                <p className="py-6 text-center text-sm text-muted">No orders found</p>
              )}
              {orders.map((order) => (
                <MobileDataCard
                  key={order.id}
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
                {isLoading &&
                  Array.from({ length: 5 }).map((_, i) => <TableRowSkeleton key={i} cols={9} />)}
                {!isLoading && !loadError && orders.length === 0 && (
                  <tr>
                    <td colSpan={9} className="px-4 py-8 text-center text-muted">
                      No orders found
                    </td>
                  </tr>
                )}
                {orders.map((order) => (
                  <tr
                    key={order.id}
                    className="border-b border-border transition-colors hover:bg-surface-elevated/50"
                  >
                    <td className="px-4 py-3 font-mono text-xs">
                      #{order.id.slice(0, 8).toUpperCase()}
                    </td>
                    <td className="px-4 py-3">{order.customer_name || "Guest"}</td>
                    <td className="px-4 py-3 text-muted">{order.customer_phone || "—"}</td>
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
                    <td className="px-4 py-3 text-muted">{formatDate(order.created_at)}</td>
                    <td className="px-4 py-3">{orderActions(order)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableScroll>
        </ResponsiveDataView>
      </Card>
    </BackendPage>
  );
}
