"use client";

import { useQuery } from "@tanstack/react-query";
import { Users } from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { TableRowSkeleton } from "@/components/ui/LoadingSkeleton";
import { crmService } from "@/services/crm.service";
import { formatCurrency, formatDate } from "@/lib/utils";

export default function CrmPage() {
  const { data: customersData, isLoading: customersLoading } = useQuery({
    queryKey: ["customers"],
    queryFn: () => crmService.getCustomers(),
  });

  const { data: insights } = useQuery({
    queryKey: ["crm-insights"],
    queryFn: () => crmService.getInsights(),
  });

  const customers = customersData?.customers ?? [];

  return (
    <div className="animate-fade-in">
      <header className="mb-6">
        <div className="flex items-center gap-3">
          <Users className="h-7 w-7 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">CRM</h1>
            <p className="text-sm text-muted">Customer profiles and engagement</p>
          </div>
        </div>
      </header>

      {insights && (
        <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="py-4">
              <p className="text-sm text-muted">Total customers</p>
              <p className="mt-1 text-2xl font-bold">{insights.total_customers}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-4">
              <p className="text-sm text-muted">Returning</p>
              <p className="mt-1 text-2xl font-bold">{insights.returning_customers}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-4">
              <p className="text-sm text-muted">Loyal (5+ orders)</p>
              <p className="mt-1 text-2xl font-bold">{insights.loyal_customers}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-4">
              <p className="text-sm text-muted">Avg order value</p>
              <p className="mt-1 text-2xl font-bold font-mono">
                {formatCurrency(insights.average_order_value)}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {insights?.top_customers && insights.top_customers.length > 0 && (
        <Card className="mb-6">
          <CardContent className="py-4">
            <h2 className="mb-3 font-semibold">Top customers</h2>
            <div className="space-y-2">
              {insights.top_customers.map((c) => (
                <div key={c.id} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{c.name}</span>
                    <Badge variant="outline" className="capitalize">
                      {c.segment}
                    </Badge>
                  </div>
                  <span className="font-mono">{formatCurrency(c.total_spent)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted">
                <th className="sticky top-0 bg-surface px-4 py-3 font-medium">Name</th>
                <th className="sticky top-0 bg-surface px-4 py-3 font-medium">Phone</th>
                <th className="sticky top-0 bg-surface px-4 py-3 font-medium">Segment</th>
                <th className="sticky top-0 bg-surface px-4 py-3 font-medium">Orders</th>
                <th className="sticky top-0 bg-surface px-4 py-3 font-medium">Total Spent</th>
                <th className="sticky top-0 bg-surface px-4 py-3 font-medium">Last Order</th>
              </tr>
            </thead>
            <tbody>
              {customersLoading &&
                Array.from({ length: 5 }).map((_, i) => <TableRowSkeleton key={i} cols={6} />)}
              {!customersLoading && customers.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-muted">
                    No customers yet
                  </td>
                </tr>
              )}
              {customers.map((customer) => (
                <tr
                  key={customer.id}
                  className="border-b border-border transition-colors hover:bg-surface-elevated/50"
                >
                  <td className="px-4 py-3 font-medium">{customer.name}</td>
                  <td className="px-4 py-3 text-muted">{customer.phone ?? "—"}</td>
                  <td className="px-4 py-3 capitalize text-muted">
                    {customer.profile?.segment ?? "new"}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant="outline">
                      {customer.profile?.total_orders ?? customer.profile?.order_count ?? 0}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 font-mono">
                    {formatCurrency(customer.profile?.total_spent ?? 0)}
                  </td>
                  <td className="px-4 py-3 text-muted">
                    {customer.profile?.last_order_at
                      ? formatDate(customer.profile.last_order_at)
                      : "—"}
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
