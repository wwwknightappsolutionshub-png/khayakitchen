"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Button } from "@/components/ui/Button";
import { BackendPage } from "@/components/shared/BackendPage";
import { TableRowSkeleton } from "@/components/ui/LoadingSkeleton";
import { BACKEND_TABLE_CLASS, TableScroll } from "@/components/ui/TableScroll";
import { ordersService } from "@/services/orders.service";
import { formatCurrency, formatDate, cn } from "@/lib/utils";

const statusFilters = ["all", "pending", "preparing", "ready", "completed", "cancelled"];

export default function OrdersPage() {
  const [statusFilter, setStatusFilter] = useState("all");
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["orders", statusFilter],
    queryFn: () =>
      ordersService.getOrders(statusFilter === "all" ? undefined : statusFilter),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      ordersService.updateStatus(id, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["orders"] }),
  });

  const orders = data?.orders ?? [];

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

      <Card>
        <TableScroll bordered={false}>
          <table className={BACKEND_TABLE_CLASS}>
            <thead>
              <tr className="border-b border-border text-left text-muted">
                <th className="sticky top-0 bg-surface px-4 py-3 font-medium">Order</th>
                <th className="sticky top-0 bg-surface px-4 py-3 font-medium">Type</th>
                <th className="sticky top-0 bg-surface px-4 py-3 font-medium">Status</th>
                <th className="sticky top-0 bg-surface px-4 py-3 font-medium">Total</th>
                <th className="sticky top-0 bg-surface px-4 py-3 font-medium">Created</th>
                <th className="sticky top-0 bg-surface px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading &&
                Array.from({ length: 5 }).map((_, i) => <TableRowSkeleton key={i} cols={6} />)}
              {!isLoading && orders.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-muted">
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
                  <td className="px-4 py-3 capitalize">{order.order_type}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={order.status} />
                  </td>
                  <td className="px-4 py-3 font-mono">
                    {formatCurrency(order.total_amount)}
                  </td>
                  <td className="px-4 py-3 text-muted">{formatDate(order.created_at)}</td>
                  <td className="px-4 py-3">
                    {order.status === "pending" && (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() =>
                          updateMutation.mutate({ id: order.id, status: "preparing" })
                        }
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
