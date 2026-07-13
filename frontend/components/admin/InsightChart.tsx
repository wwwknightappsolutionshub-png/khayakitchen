"use client";

import type { MealPopularity } from "@/lib/order-analytics";
import { LoadingSkeleton } from "@/components/ui/LoadingSkeleton";

interface InsightChartProps {
  insight: string;
  mealPopularity: MealPopularity[];
  isLoading?: boolean;
}

export function InsightChart({ insight, mealPopularity, isLoading }: InsightChartProps) {
  if (isLoading) {
    return <LoadingSkeleton className="h-40 w-full" />;
  }

  const top = mealPopularity.slice(0, 5);
  const maxQty = Math.max(...top.map((m) => m.quantity), 1);

  return (
    <div className="space-y-4">
      <p className="text-sm leading-relaxed text-foreground">{insight}</p>
      {top.length === 0 ? (
        <p className="text-sm text-muted">No meal volume to chart yet today.</p>
      ) : (
        <div className="space-y-2" role="img" aria-label="Top meals by quantity sold today">
          {top.map((meal) => (
            <div key={meal.mealId} className="space-y-1">
              <div className="flex items-center justify-between gap-2 text-xs">
                <span className="truncate font-medium">{meal.mealName}</span>
                <span className="shrink-0 font-mono text-muted">{meal.quantity}</span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-surface-elevated">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: `${Math.max(6, (meal.quantity / maxQty) * 100)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
