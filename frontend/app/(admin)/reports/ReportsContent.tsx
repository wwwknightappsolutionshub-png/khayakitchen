"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { dashboardService } from "@/services/dashboard.service";
import { formatCurrency } from "@/lib/utils";
import { BarChart3 } from "lucide-react";

export function ReportsContent() {
  const { data: trends } = useQuery({
    queryKey: ["dashboard", "sales-trends"],
    queryFn: () => dashboardService.getSalesTrends(),
  });

  const { data: health } = useQuery({
    queryKey: ["dashboard", "inventory-health"],
    queryFn: () => dashboardService.getInventoryHealth(),
  });

  const totalRevenue = trends?.trends?.reduce((sum, d) => sum + d.revenue, 0) ?? 0;
  const totalOrders = trends?.trends?.reduce((sum, d) => sum + d.orders, 0) ?? 0;

  return (
    <div className="animate-fade-in">
      <header className="mb-6 flex items-center gap-3">
        <BarChart3 className="h-7 w-7 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Reports</h1>
          <p className="text-sm text-muted">Sales and inventory analytics</p>
        </div>
      </header>

      <div className="mb-6 grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted">Period Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-mono text-3xl font-bold">{formatCurrency(totalRevenue)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted">Period Orders</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-mono text-3xl font-bold">{totalOrders}</p>
          </CardContent>
        </Card>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Daily Sales</CardTitle>
        </CardHeader>
        <CardContent>
          {trends?.trends && trends.trends.length > 0 ? (
            <div className="space-y-3">
              {trends.trends.map((day) => {
                const maxRevenue = Math.max(...trends.trends.map((d) => d.revenue), 1);
                const width = (day.revenue / maxRevenue) * 100;
                return (
                  <div key={day.date}>
                    <div className="mb-1 flex justify-between text-sm">
                      <span className="text-muted">{day.date}</span>
                      <span className="font-mono">
                        {formatCurrency(day.revenue)} · {day.orders} orders
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
          ) : (
            <p className="text-sm text-muted">No sales data available</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Inventory Health Report</CardTitle>
        </CardHeader>
        <CardContent>
          {health?.items && health.items.length > 0 ? (
            <p className="text-sm">
              <span className="font-mono text-xl font-bold text-warning">
                {health.items.length}
              </span>{" "}
              items below reorder level
            </p>
          ) : (
            <p className="text-sm text-muted">All inventory items are above reorder levels</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
