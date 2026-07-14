import { api } from "@/lib/api-client";

export interface StaffPerformanceRow {
  user_id: string;
  name: string;
  email: string;
  role: string;
  role_label: string;
  orders_handled: number;
  customers_served: number;
  completed_orders: number;
  avg_handle_minutes: number | null;
}

export interface StaffPerformanceDaily {
  date: string;
  orders_touched: number;
  waiter_orders: number;
}

export interface StaffPerformanceOverview {
  from: string;
  to: string;
  free_until: string | null;
  entitled: boolean;
  waiters: StaffPerformanceRow[];
  chefs: StaffPerformanceRow[];
  daily: StaffPerformanceDaily[];
}

export const staffPerformanceService = {
  getOverview(params?: { from?: string; to?: string; role?: string }) {
    return api.get<StaffPerformanceOverview>("/staff-performance", { params });
  },
};
