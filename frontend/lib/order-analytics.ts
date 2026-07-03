import type { Meal, Order } from "@/lib/types";

export interface TopSellerRow {
  label: string;
  quantity: number;
  type: "meal" | "addon";
  mealId?: string;
  optionId?: string;
}

export interface MealPopularity {
  mealId: string;
  mealName: string;
  quantity: number;
}

export interface AddonPopularity {
  optionId: string;
  name: string;
  quantity: number;
  mealId?: string;
}

const ACTIVE_STATUSES = new Set(["pending", "accepted", "preparing", "ready"]);

function isToday(iso: string): boolean {
  const d = new Date(iso);
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

export function filterTodayOrders(orders: Order[]): Order[] {
  return orders.filter((o) => o.status !== "cancelled" && isToday(o.created_at));
}

export function countPendingOrders(orders: Order[]): number {
  return orders.filter((o) => ACTIVE_STATUSES.has(o.status)).length;
}

export function computeAverageOrderValue(orders: Order[]): number {
  const completed = orders.filter((o) => o.status === "completed");
  if (completed.length === 0) return 0;
  const total = completed.reduce((sum, o) => sum + Number(o.total_amount), 0);
  return total / completed.length;
}

export function aggregateTopSellers(
  orders: Order[],
  meals: Meal[],
): { meals: MealPopularity[]; addons: AddonPopularity[]; rows: TopSellerRow[] } {
  const mealCounts = new Map<string, number>();
  const addonCounts = new Map<string, number>();

  for (const order of orders) {
    for (const item of order.items ?? []) {
      const qty = item.quantity ?? 1;
      mealCounts.set(item.meal_id, (mealCounts.get(item.meal_id) ?? 0) + qty);

      for (const opt of item.options ?? []) {
        const id = opt.option_id;
        addonCounts.set(id, (addonCounts.get(id) ?? 0) + qty);
      }
    }
  }

  const mealNameById = new Map(meals.map((m) => [m.id, m.name]));
  const optionMeta = new Map<string, { name: string; mealId: string }>();
  for (const meal of meals) {
    for (const group of meal.options ?? []) {
      for (const opt of group.options ?? []) {
        optionMeta.set(opt.id, { name: opt.name, mealId: meal.id });
      }
    }
  }

  const mealPopularity: MealPopularity[] = [...mealCounts.entries()]
    .map(([mealId, quantity]) => ({
      mealId,
      mealName: mealNameById.get(mealId) ?? itemLabelFromOrders(orders, mealId) ?? "Meal",
      quantity,
    }))
    .sort((a, b) => b.quantity - a.quantity);

  const addonPopularity: AddonPopularity[] = [...addonCounts.entries()]
    .map(([optionId, quantity]) => {
      const meta = optionMeta.get(optionId);
      return {
        optionId,
        name: meta?.name ?? "Add-on",
        quantity,
        mealId: meta?.mealId,
      };
    })
    .sort((a, b) => b.quantity - a.quantity);

  const rows: TopSellerRow[] = [
    ...mealPopularity.map((m) => ({
      label: m.mealName,
      quantity: m.quantity,
      type: "meal" as const,
      mealId: m.mealId,
    })),
    ...addonPopularity.map((a) => ({
      label: a.name,
      quantity: a.quantity,
      type: "addon" as const,
      optionId: a.optionId,
      mealId: a.mealId,
    })),
  ].sort((a, b) => b.quantity - a.quantity);

  return { meals: mealPopularity, addons: addonPopularity, rows };
}

function itemLabelFromOrders(orders: Order[], mealId: string): string | null {
  for (const order of orders) {
    for (const item of order.items ?? []) {
      if (item.meal_id === mealId && item.meal?.name) return item.meal.name;
    }
  }
  return null;
}

export function buildInsightSentence(
  ordersToday: Order[],
  trends: { date: string; revenue: number; orders: number }[],
): string {
  const todayKey = new Date().toISOString().slice(0, 10);
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayKey = yesterday.toISOString().slice(0, 10);

  const todayTrend = trends.find((t) => t.date === todayKey);
  const yesterdayTrend = trends.find((t) => t.date === yesterdayKey);

  if (todayTrend && yesterdayTrend && yesterdayTrend.orders > 0) {
    const pct = Math.round(
      ((todayTrend.orders - yesterdayTrend.orders) / yesterdayTrend.orders) * 100,
    );
    if (pct > 0) return `You are ${pct}% busier than yesterday`;
    if (pct < 0) return `You are ${Math.abs(pct)}% quieter than yesterday`;
  }

  const hourCounts = new Map<number, number>();
  for (const order of ordersToday) {
    const hour = new Date(order.created_at).getHours();
    hourCounts.set(hour, (hourCounts.get(hour) ?? 0) + 1);
  }

  if (hourCounts.size > 0) {
    const peakHour = [...hourCounts.entries()].sort((a, b) => b[1] - a[1])[0][0];
    if (peakHour >= 11 && peakHour <= 14) return "Lunch period is your peak time";
    if (peakHour >= 17 && peakHour <= 21) return "Evening is your busiest window today";
    if (peakHour >= 7 && peakHour <= 10) return "Morning orders are driving today's volume";
  }

  if (ordersToday.length > 0) {
    return "Orders are flowing steadily — keep the kitchen moving";
  }

  return "No orders yet today — status and promos help drive your first sales";
}

export function displayOrderStatus(status: string): string {
  if (status === "preparing") return "cooking";
  if (status === "accepted") return "pending";
  return status;
}

export function orderStatusColor(status: string): string {
  const key = displayOrderStatus(status);
  const map: Record<string, string> = {
    pending: "text-status-pending",
    cooking: "text-status-preparing",
    ready: "text-status-ready",
    completed: "text-status-completed",
    cancelled: "text-status-cancelled",
  };
  return map[key] ?? "text-muted";
}

export function fallbackMealRanking(meals: Meal[]): MealPopularity[] {
  return meals.slice(0, 6).map((meal, index) => ({
    mealId: meal.id,
    mealName: meal.name,
    quantity: Math.max(1, 6 - index),
  }));
}

export function fallbackAddons(meals: Meal[]): AddonPopularity[] {
  const addons: AddonPopularity[] = [];
  for (const meal of meals) {
    for (const group of meal.options ?? []) {
      if (!/extra|add-on|addon/i.test(group.group) && group.type !== "multiple") continue;
      for (const opt of group.options ?? []) {
        addons.push({
          optionId: opt.id,
          name: opt.name,
          quantity: 0,
          mealId: meal.id,
        });
      }
    }
  }
  return addons.slice(0, 6);
}
