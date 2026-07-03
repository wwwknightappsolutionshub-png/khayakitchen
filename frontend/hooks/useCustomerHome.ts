import { useQuery } from "@tanstack/react-query";
import type { Meal } from "@/lib/types";
import { analyticsService } from "@/services/analytics.service";
import { useStorefront } from "@/hooks/useStorefront";
import { useMenu } from "@/hooks/useMenu";

export function useCustomerHome() {
  const storefront = useStorefront();
  const menu = useMenu();

  const analytics = useQuery({
    queryKey: ["analytics", "customer-home"],
    queryFn: () => analyticsService.getCustomerHomeSummary(),
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

  const meals = menu.data?.meals ?? [];
  const mealById = new Map(meals.map((m) => [m.id, m]));
  const popularity = analytics.data?.mealPopularity ?? [];
  const featuredId = popularity[0]?.mealId;
  const featuredMeal = featuredId ? mealById.get(featuredId) : meals[0];
  const popularMeals = popularity
    .slice(0, 6)
    .map((p) => mealById.get(p.mealId))
    .filter((m): m is Meal => Boolean(m));

  const isClosed = storefront.data?.status?.is_accepting_orders === false;

  return {
    storefront,
    menu,
    analytics,
    featuredMeal,
    popularMeals,
    popularMealsMeta: popularity.slice(0, 6),
    addonPopularity: analytics.data?.addonPopularity ?? [],
    isClosed,
    hasLiveSalesData: analytics.data?.hasLiveSalesData ?? false,
  };
}
