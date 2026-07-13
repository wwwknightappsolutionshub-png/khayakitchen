import { dashboardService } from "@/services/dashboard.service";
import { ordersService } from "@/services/orders.service";
import { menuService } from "@/services/menu.service";
import {
  aggregateTopSellers,
  buildInsightSentence,
  computeAverageOrderValue,
  countPendingOrders,
  fallbackAddons,
  fallbackMealRanking,
  filterTodayOrders,
  type AddonPopularity,
  type MealPopularity,
  type TopSellerRow,
} from "@/lib/order-analytics";
import type { Order } from "@/lib/types";

export interface OperationsSummary {
  revenueToday: number;
  ordersToday: number;
  averageOrderValue: number;
  pendingOrdersCount: number;
  topSellers: TopSellerRow[];
  mealPopularity: MealPopularity[];
  addonPopularity: AddonPopularity[];
  insight: string;
  liveOrders: Order[];
}

export interface CustomerHomeSummary {
  mealPopularity: MealPopularity[];
  addonPopularity: AddonPopularity[];
  ordersTodayCount: number;
  hasLiveSalesData: boolean;
}

export const analyticsService = {
  async getOperationsSummary(): Promise<OperationsSummary> {
    const [kpisResult, trendsResult, ordersResult, menuResult] = await Promise.allSettled([
      dashboardService.getKpis(),
      dashboardService.getSalesTrends(),
      ordersService.getOrders(),
      menuService.getMenu(),
    ]);

    if (ordersResult.status === "rejected") {
      throw ordersResult.reason instanceof Error
        ? ordersResult.reason
        : new Error("Failed to load orders for operations summary.");
    }

    const kpis =
      kpisResult.status === "fulfilled"
        ? kpisResult.value
        : { revenue_today: 0, orders_today: 0 };
    const trends =
      trendsResult.status === "fulfilled" ? trendsResult.value : { trends: [] };
    const meals =
      menuResult.status === "fulfilled" ? (menuResult.value.meals ?? []) : [];
    const allOrders = ordersResult.value.orders ?? [];
    const todayOrders = filterTodayOrders(allOrders);
    const { rows, meals: mealPopularity, addons: addonPopularity } = aggregateTopSellers(
      todayOrders,
      meals,
    );

    const liveOrders = todayOrders
      .filter((o) => o.status !== "completed" && o.status !== "cancelled")
      .slice(0, 12);

    return {
      revenueToday: kpis.revenue_today ?? 0,
      ordersToday: kpis.orders_today ?? todayOrders.length,
      averageOrderValue:
        todayOrders.length > 0
          ? computeAverageOrderValue(todayOrders)
          : kpis.orders_today > 0
            ? (kpis.revenue_today ?? 0) / kpis.orders_today
            : 0,
      pendingOrdersCount: countPendingOrders(allOrders),
      topSellers: rows.slice(0, 8),
      mealPopularity,
      addonPopularity,
      insight: buildInsightSentence(todayOrders, trends.trends ?? []),
      liveOrders,
    };
  },

  async getCustomerHomeSummary(): Promise<CustomerHomeSummary> {
    const menuResult = await menuService.getMenu();
    const meals = menuResult.meals ?? [];

    try {
      const [ordersResult, kpis] = await Promise.all([
        ordersService.getOrders(),
        dashboardService.getKpis(),
      ]);
      const todayOrders = filterTodayOrders(ordersResult.orders ?? []);
      const { meals: mealPopularity, addons: addonPopularity } = aggregateTopSellers(
        todayOrders,
        meals,
      );

      return {
        mealPopularity:
          mealPopularity.length > 0 ? mealPopularity : fallbackMealRanking(meals),
        addonPopularity:
          addonPopularity.length > 0 ? addonPopularity : fallbackAddons(meals),
        ordersTodayCount: kpis.orders_today ?? todayOrders.length,
        hasLiveSalesData: mealPopularity.length > 0,
      };
    } catch {
      return {
        mealPopularity: fallbackMealRanking(meals),
        addonPopularity: fallbackAddons(meals),
        ordersTodayCount: 0,
        hasLiveSalesData: false,
      };
    }
  },
};
