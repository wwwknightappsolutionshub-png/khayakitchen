"use client";

import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Landmark } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { BackendPage } from "@/components/shared/BackendPage";
import { TableRowSkeleton } from "@/components/ui/LoadingSkeleton";
import { BACKEND_TABLE_CLASS, TableScroll } from "@/components/ui/TableScroll";
import { MobileDataCard, ResponsiveDataView } from "@/components/ui/MobileDataCard";
import { ordersService } from "@/services/orders.service";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { AccountRow } from "@/lib/types";

export default function AccountsPage() {
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ["accounts"],
    queryFn: () => ordersService.getAccounts(),
    refetchInterval: 15_000,
  });

  const verifyMutation = useMutation({
    mutationFn: (orderId: string) => ordersService.verifyAccountPayment(orderId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
    },
  });

  const accounts = data?.accounts ?? [];

  const mealSummary = (row: AccountRow) =>
    row.meals.map((m) => `${m.quantity}× ${m.name}`).join(", ") || "—";

  return (
    <BackendPage>
      <header className="backend-header">
        <div className="flex items-center gap-3">
          <Landmark className="h-7 w-7 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Accounts</h1>
            <p className="text-sm text-muted">
              Bank transfer proofs · verify before accepting on Orders
            </p>
          </div>
        </div>
        <div className="backend-header-actions">
          <Link href="/orders">
            <Button variant="secondary">Open Orders</Button>
          </Link>
        </div>
      </header>

      <Card>
        {isLoading ? (
          <TableRowSkeleton cols={9} />
        ) : error ? (
          <p className="p-4 text-sm text-primary">Failed to load accounts.</p>
        ) : accounts.length === 0 ? (
          <p className="p-6 text-sm text-muted">No bank transfer orders yet.</p>
        ) : (
          <ResponsiveDataView
            mobile={
              <>
                {accounts.map((row) => (
                  <MobileDataCard
                    key={row.order_id}
                    title={`#${row.order_no}`}
                    subtitle={row.customer_name || "Guest"}
                    meta={
                      <Badge variant={row.payment_verified ? "secondary" : "warning"}>
                        {row.payment_verified
                          ? "Verified"
                          : row.attachment
                            ? "Proof submitted"
                            : "Awaiting proof"}
                      </Badge>
                    }
                    rows={[
                      { label: "Customer", value: row.customer_name || "Guest" },
                      { label: "Meals", value: mealSummary(row) },
                      { label: "Total", value: formatCurrency(row.total_amount) },
                      { label: "Ordered", value: formatDate(row.ordered_at) },
                      { label: "Channel", value: row.payment_channel || "—" },
                      {
                        label: "Attachment",
                        value: row.attachment ? (
                          <a
                            href={row.attachment.url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-primary underline"
                          >
                            {row.attachment.name || "View proof"}
                          </a>
                        ) : (
                          "—"
                        ),
                      },
                    ]}
                    actions={
                      <div className="flex flex-wrap gap-2">
                        <Link href={`/orders?highlight=${row.order_id}`}>
                          <Button size="sm" variant="secondary">
                            View order
                          </Button>
                        </Link>
                        {!row.payment_verified && row.attachment && (
                          <Button
                            size="sm"
                            disabled={verifyMutation.isPending}
                            onClick={() => verifyMutation.mutate(row.order_id)}
                          >
                            Verify payment
                          </Button>
                        )}
                      </div>
                    }
                  />
                ))}
              </>
            }
          >
            <TableScroll bordered={false}>
              <table className={BACKEND_TABLE_CLASS}>
                <thead>
                  <tr className="border-b border-border text-left text-muted">
                    <th className="sticky top-0 bg-surface px-4 py-3 font-medium">Order No</th>
                    <th className="sticky top-0 bg-surface px-4 py-3 font-medium">Customer</th>
                    <th className="sticky top-0 bg-surface px-4 py-3 font-medium">Meal details</th>
                    <th className="sticky top-0 bg-surface px-4 py-3 font-medium">Total</th>
                    <th className="sticky top-0 bg-surface px-4 py-3 font-medium">Ordered</th>
                    <th className="sticky top-0 bg-surface px-4 py-3 font-medium">Channel</th>
                    <th className="sticky top-0 bg-surface px-4 py-3 font-medium">Attachment</th>
                    <th className="sticky top-0 bg-surface px-4 py-3 font-medium">Status</th>
                    <th className="sticky top-0 bg-surface px-4 py-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {accounts.map((row) => (
                    <tr key={row.order_id} className="border-b border-border/60">
                      <td className="px-4 py-3 font-mono text-sm">#{row.order_no}</td>
                      <td className="px-4 py-3 text-sm">{row.customer_name || "Guest"}</td>
                      <td className="px-4 py-3 text-sm">
                        <ul className="space-y-1">
                          {row.meals.map((m, i) => (
                            <li key={`${row.order_id}-${i}`}>
                              {m.quantity}× {m.name}
                            </li>
                          ))}
                        </ul>
                      </td>
                      <td className="px-4 py-3 font-mono">{formatCurrency(row.total_amount)}</td>
                      <td className="px-4 py-3 text-muted text-sm">{formatDate(row.ordered_at)}</td>
                      <td className="px-4 py-3 capitalize text-muted">{row.payment_channel || "—"}</td>
                      <td className="px-4 py-3 text-sm">
                        {row.attachment ? (
                          <a
                            href={row.attachment.url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-primary underline"
                          >
                            {row.attachment.name || "View"}
                          </a>
                        ) : (
                          <span className="text-muted">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={row.payment_verified ? "secondary" : "warning"}>
                          {row.payment_verified
                            ? "Verified"
                            : row.attachment
                              ? "Proof submitted"
                              : "Awaiting proof"}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-2">
                          <Link href={`/orders?highlight=${row.order_id}`}>
                            <Button size="sm" variant="secondary">
                              Orders
                            </Button>
                          </Link>
                          {!row.payment_verified && row.attachment && (
                            <Button
                              size="sm"
                              disabled={verifyMutation.isPending}
                              onClick={() => verifyMutation.mutate(row.order_id)}
                            >
                              Verify
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableScroll>
          </ResponsiveDataView>
        )}
      </Card>
    </BackendPage>
  );
}
