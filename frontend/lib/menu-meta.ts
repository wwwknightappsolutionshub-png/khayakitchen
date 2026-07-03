import type { Meal } from "@/lib/types";

export type MealBadgeType = "most-ordered" | "chefs-pick" | "popular-today" | "low-stock";

const BADGE_LABELS: Record<MealBadgeType, string> = {
  "most-ordered": "Most Ordered",
  "chefs-pick": "Chef's Pick",
  "popular-today": "Popular Today",
  "low-stock": "Low Stock",
};

const MEAL_BADGES: Record<string, MealBadgeType[]> = {
  "Jollof Rice": ["most-ordered"],
  "Egusi Soup": ["chefs-pick"],
  "Suya Skewers": ["popular-today"],
};

const PAIRINGS: Record<string, string> = {
  "Jollof Rice": "Fried Plantain",
  "Egusi Soup": "Pounded Yam",
  "Suya Skewers": "Fried Plantain",
  "Pounded Yam": "Egusi Soup",
};

export function getMealBadges(meal: Meal, lowStockCount?: number): MealBadgeType[] {
  const badges = [...(MEAL_BADGES[meal.name] ?? [])];
  if (lowStockCount !== undefined && lowStockCount > 0 && lowStockCount <= 5) {
    badges.push("low-stock");
  }
  return badges;
}

export function getBadgeLabel(type: MealBadgeType): string {
  return BADGE_LABELS[type];
}

export function getLowStockMessage(count: number): string {
  return `Only ${count} left today`;
}

export function getPairingSuggestion(mealName: string): string | null {
  const pairing = PAIRINGS[mealName];
  return pairing ? `Pairs well with ${pairing}` : null;
}

export const MENU_SOCIAL_PROOF = "32 orders today";
