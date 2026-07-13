"use client";

import { Activity } from "lucide-react";
import { KpiCard } from "@/components/ui/KpiCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { CardSkeleton } from "@/components/ui/LoadingSkeleton";
import { LiveDashboardStatusControl } from "@/components/admin/LiveDashboardStatusControl";
import { TopSellingItems } from "@/components/admin/TopSellingItems";
import { LiveOrdersFeed } from "@/components/admin/LiveOrdersFeed";
import { InsightChart } from "@/components/admin/InsightChart";
import { NewOrderAlertBadge } from "@/components/admin/NewOrderAlertBadge";
import { useLiveDashboard } from "@/hooks/useLiveDashboard";
import { useNewOrderAlerts } from "@/hooks/useNewOrderAlerts";
import { BackendPage } from "@/components/shared/BackendPage";
import { ReconnectingIndicator } from "@/components/shared/ReconnectingIndicator";
import { useAuthStore } from "@/stores/auth-store";
import { cn } from "@/lib/utils";

export default function LiveRestaurantDashboardPage() {
  const { summary, status } = useLiveDashboard();
  const role = useAuthStore((s) => s.user?.role);
  const canManage = role === "owner" || role === "super_admin";
  const data = summary.data;
  const restaurantStatus = status.data?.status;
  const { newCount, muted, setMuted, clearAlerts } = useNewOrderAlerts(data?.liveOrders);

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
        <div className="backend-header-actions flex flex-col items-end gap-2 sm:flex-row sm:items-center">
          <NewOrderAlertBadge
            count={newCount}
            muted={muted}
            onToggleMute={() => setMuted(!muted)}
            onClear={clearAlerts}
          />
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
            <div
              className={cn(
                "rounded-[var(--radius)]",
                newCount > 0 && "ring-2 ring-danger ring-offset-2 ring-offset-background",
              )}
            >
              <KpiCard label="Pending Orders" value={data?.pendingOrdersCount ?? 0} />
            </div>
          </>
        )}
      </section>

      <Card className="mb-6">
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
              closingAt={restaurantStatus?.closing_at}
              promoEndsAt={restaurantStatus?.promo_ends_at}
              promoMeals={restaurantStatus?.promo_meals}
              disabled={!canManage}
            />
          )}
        </CardContent>
      </Card>

      <div className="mb-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Top Selling Today</CardTitle>
          </CardHeader>
          <CardContent>
            <TopSellingItems items={data?.topSellers ?? []} isLoading={summary.isLoading} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Live Orders</CardTitle>
          </CardHeader>
          <CardContent>
            <LiveOrdersFeed orders={data?.liveOrders ?? []} isLoading={summary.isLoading} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Insight</CardTitle>
        </CardHeader>
        <CardContent>
          <InsightChart
            insight={data?.insight ?? "Loading insight…"}
            mealPopularity={data?.mealPopularity ?? []}
            isLoading={summary.isLoading}
          />
        </CardContent>
      </Card>
    </BackendPage>
  );
}
