"use client";

import { Activity } from "lucide-react";
import { KpiCard } from "@/components/ui/KpiCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { CardSkeleton } from "@/components/ui/LoadingSkeleton";
import { LiveDashboardStatusControl } from "@/components/admin/LiveDashboardStatusControl";
import { TopSellingItems } from "@/components/admin/TopSellingItems";
import { LiveOrdersFeed } from "@/components/admin/LiveOrdersFeed";
import { useLiveDashboard } from "@/hooks/useLiveDashboard";
import { BackendPage } from "@/components/shared/BackendPage";
import { ReconnectingIndicator } from "@/components/shared/ReconnectingIndicator";

export default function LiveRestaurantDashboardPage() {
  const { summary, status } = useLiveDashboard();
  const data = summary.data;
  const restaurantStatus = status.data?.status;

  return (
    <BackendPage>
      <header className="backend-header items-start">
        <div className="flex items-center gap-3">
          <Activity className="h-7 w-7 text-primary" />
          <div>
            <h1 className="text-xl font-bold sm:text-2xl">Live Restaurant Dashboard</h1>
            <p className="text-sm text-muted">Mobile POS · hybrid real-time</p>
          </div>
        </div>
        <div className="backend-header-actions">
          <ReconnectingIndicator />
        </div>
      </header>

      <section className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {summary.isLoading ? (
          Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} />)
        ) : (
          <>
            <KpiCard label="Today Revenue" value={data?.revenueToday ?? 0} format="currency" />
            <KpiCard label="Orders Today" value={data?.ordersToday ?? 0} />
            <KpiCard
              label="Average Order Value"
              value={data?.averageOrderValue ?? 0}
              format="currency"
            />
            <KpiCard label="Pending Orders" value={data?.pendingOrdersCount ?? 0} />
          </>
        )}
      </section>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg">Restaurant Status</CardTitle>
          </CardHeader>
          <CardContent>
            {status.isLoading ? (
              <CardSkeleton />
            ) : (
              <LiveDashboardStatusControl
                currentStatus={restaurantStatus?.status}
                isAcceptingOrders={restaurantStatus?.is_accepting_orders}
              />
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">Top Selling Today</CardTitle>
          </CardHeader>
          <CardContent>
            <TopSellingItems items={data?.topSellers ?? []} isLoading={summary.isLoading} />
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">Live Orders</CardTitle>
          </CardHeader>
          <CardContent>
            <LiveOrdersFeed orders={data?.liveOrders ?? []} isLoading={summary.isLoading} />
          </CardContent>
        </Card>

        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg">Insight</CardTitle>
          </CardHeader>
          <CardContent>
            {summary.isLoading ? (
              <CardSkeleton />
            ) : (
              <p className="text-sm leading-relaxed text-foreground">{data?.insight}</p>
            )}
          </CardContent>
        </Card>
      </div>
    </BackendPage>
  );
}
