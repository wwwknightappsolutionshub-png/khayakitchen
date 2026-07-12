"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Users } from "lucide-react";
import { BackendPage } from "@/components/shared/BackendPage";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { TableRowSkeleton } from "@/components/ui/LoadingSkeleton";
import { BACKEND_TABLE_CLASS, TableScroll } from "@/components/ui/TableScroll";
import { MobileDataCard, ResponsiveDataView } from "@/components/ui/MobileDataCard";
import { crmService } from "@/services/crm.service";
import { formatCurrency, formatDate } from "@/lib/utils";

function defaultRange() {
  const to = new Date();
  const from = new Date();
  from.setDate(to.getDate() - 30);
  return {
    from: from.toISOString().slice(0, 10),
    to: to.toISOString().slice(0, 10),
  };
}

export default function CrmPage() {
  const initial = useMemo(() => defaultRange(), []);
  const [from, setFrom] = useState(initial.from);
  const [to, setTo] = useState(initial.to);
  const [applied, setApplied] = useState(initial);

  const { data: customersData, isLoading: customersLoading } = useQuery({
    queryKey: ["customers"],
    queryFn: () => crmService.getCustomers(),
  });

  const { data: insights } = useQuery({
    queryKey: ["crm-insights"],
    queryFn: () => crmService.getInsights(),
  });

  const { data: analytics, isFetching: analyticsLoading } = useQuery({
    queryKey: ["crm-analytics", applied.from, applied.to],
    queryFn: () => crmService.getStrategicAnalytics(applied.from, applied.to),
  });

  const customers = customersData?.customers ?? [];

  return (
    <BackendPage>
      <header className="backend-header">
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

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Strategic analytics</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <Input
              label="From"
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
            />
            <Input label="To" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
            <Button
              onClick={() => setApplied({ from, to })}
              disabled={!from || !to || from > to}
              isLoading={analyticsLoading}
            >
              Apply range
            </Button>
          </div>

          {analytics && (
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-[var(--radius)] border border-border p-4">
                <p className="text-sm text-muted">Total amount spent in period</p>
                <p className="mt-1 font-mono text-2xl font-bold">
                  {formatCurrency(analytics.total_amount_spent)}
                </p>
                <p className="mt-2 text-sm text-muted">
                  Orders in period: {analytics.orders_in_period}
                </p>
              </div>
              <div className="rounded-[var(--radius)] border border-border p-4">
                <p className="text-sm text-muted">Preferred food</p>
                <p className="mt-1 text-xl font-bold">
                  {analytics.preferred_food?.meal_name ?? "—"}
                </p>
                {analytics.preferred_food && (
                  <p className="mt-2 text-sm text-muted">
                    Qty {analytics.preferred_food.quantity} · across{" "}
                    {analytics.preferred_food.order_count} line items
                  </p>
                )}
              </div>
              <div className="rounded-[var(--radius)] border border-border p-4">
                <p className="text-sm text-muted">Referral count (new referred customers)</p>
                <p className="mt-1 text-2xl font-bold">{analytics.referral_count}</p>
              </div>
              <div className="rounded-[var(--radius)] border border-border p-4">
                <p className="mb-2 text-sm font-medium">Food bought in period</p>
                <div className="max-h-48 space-y-2 overflow-y-auto">
                  {analytics.food_bought.length === 0 && (
                    <p className="text-sm text-muted">No food ordered in this range</p>
                  )}
                  {analytics.food_bought.map((item) => (
                    <div key={item.meal_name} className="flex justify-between text-sm">
                      <span>{item.meal_name}</span>
                      <span className="font-mono text-muted">×{item.quantity}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="rounded-[var(--radius)] border border-border p-4 lg:col-span-2">
                <p className="mb-3 text-sm font-medium">Reward qualification by spend</p>
                <div className="grid gap-3 sm:grid-cols-3">
                  {analytics.reward_qualification_by_spend.map((tier) => (
                    <div
                      key={tier.min_total_spent}
                      className="rounded-[var(--radius)] bg-surface-elevated/60 p-3"
                    >
                      <p className="text-sm text-muted">
                        Spent ≥ {formatCurrency(tier.min_total_spent)}
                      </p>
                      <p className="mt-1 text-xl font-bold">
                        {tier.qualified_customer_count}
                      </p>
                      <div className="mt-2 space-y-1">
                        {tier.customers.slice(0, 5).map((c) => (
                          <p key={c.customer_id} className="truncate text-xs text-muted">
                            {c.name ?? c.customer_id.slice(0, 8)} ·{" "}
                            {formatCurrency(c.total_spent)}
                          </p>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

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
        <ResponsiveDataView
          mobile={
            <>
              {customersLoading && (
                <p className="py-6 text-center text-sm text-muted">Loading customers…</p>
              )}
              {!customersLoading && customers.length === 0 && (
                <p className="py-6 text-center text-sm text-muted">No customers yet</p>
              )}
              {customers.map((customer) => (
                <MobileDataCard
                  key={customer.id}
                  title={customer.name}
                  subtitle={customer.phone ?? "—"}
                  meta={
                    <Badge variant="outline" className="capitalize">
                      {customer.profile?.segment ?? "new"}
                    </Badge>
                  }
                  rows={[
                    {
                      label: "Orders",
                      value:
                        customer.profile?.total_orders ?? customer.profile?.order_count ?? 0,
                    },
                    {
                      label: "Total spent",
                      value: formatCurrency(customer.profile?.total_spent ?? 0),
                    },
                    {
                      label: "Last order",
                      value: customer.profile?.last_order_at
                        ? formatDate(customer.profile.last_order_at)
                        : "—",
                    },
                  ]}
                />
              ))}
            </>
          }
        >
          <TableScroll bordered={false}>
            <table className={BACKEND_TABLE_CLASS}>
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
          </TableScroll>
        </ResponsiveDataView>
      </Card>
    </BackendPage>
  );
}
