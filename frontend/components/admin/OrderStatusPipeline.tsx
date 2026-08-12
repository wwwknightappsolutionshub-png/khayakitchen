"use client";

import { cn } from "@/lib/utils";

const STEPS = ["pending", "accepted", "preparing", "ready"] as const;

export function OrderStatusPipeline({ status }: { status: string }) {
  const currentIndex = STEPS.indexOf(status as (typeof STEPS)[number]);

  return (
    <div className="flex flex-wrap gap-1" aria-label="Order progress">
      {STEPS.map((step, index) => {
        const reached = currentIndex >= 0 && index <= currentIndex;
        const isCurrent = step === status;
        return (
          <span
            key={step}
            className={cn(
              "rounded-full px-2 py-0.5 text-[10px] font-medium capitalize",
              reached
                ? isCurrent
                  ? "bg-primary text-white"
                  : "bg-primary/15 text-primary"
                : "bg-surface-elevated text-muted",
            )}
          >
            {step}
          </span>
        );
      })}
    </div>
  );
}
