import { api } from "@/lib/api-client";
import type { DashboardKpis } from "@/lib/types";

export const dashboardService = {
  async getKpis(): Promise<DashboardKpis> {
    return api.get<DashboardKpis>("/dashboard/kpis");
  },

  async getSalesTrends(): Promise<{ trends: { date: string; revenue: number; orders: number }[] }> {
    return api.get("/dashboard/sales-trends");
  },

  async getInventoryHealth(): Promise<{ items: { id: string; name: string; current_stock: number; reorder_level: number }[] }> {
    return api.get("/dashboard/inventory-health");
  },
};
