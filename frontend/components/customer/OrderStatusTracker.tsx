"use client";

import { getCurrentStepIndex, getStatusSteps, getHumanStatusLabel, getEstimatedMinutes } from "@/lib/order-status";
import { OrderSavingsSummary } from "@/components/customer/OrderSavingsSummary";
import { cn } from "@/lib/utils";

interface OrderStatusTrackerProps {
  status: string;
  orderType: string;
  totalAmount: number;
  discountTotal?: number;
  orderId: string;
}

export function OrderStatusTracker({
  status,
  orderType,
  totalAmount,
  discountTotal,
  orderId,
}: OrderStatusTrackerProps) {
  const steps = getStatusSteps(orderType);
  const currentStep = getCurrentStepIndex(status);
  const humanLabel = getHumanStatusLabel(status, orderType);
  const eta = getEstimatedMinutes(status);

  return (
    <div className="space-y-6">
      <div className="text-center">
        <p className="text-xs uppercase tracking-wider text-[var(--muted)]">Order ID</p>
        <p className="mt-1 font-mono text-sm tracking-wide">
          #{orderId.slice(0, 8).toUpperCase()}
        </p>
        <p className="mt-4 text-2xl font-semibold">{humanLabel}</p>
        {eta > 0 && (
          <p className="mt-1 text-sm text-[var(--secondary)]">~{eta} min estimated</p>
        )}
      </div>

      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6">
        <div className="space-y-0">
          {steps.map((step, index) => {
            const isComplete = index <= currentStep;
            const isCurrent = index === currentStep;

            return (
              <div key={step.key} className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div
                    className={cn(
                      "flex h-3 w-3 shrink-0 rounded-full transition-colors duration-200",
                      isComplete ? "bg-[var(--primary)]" : "bg-[var(--border)]",
                      isCurrent && "ring-4 ring-[var(--primary)]/20",
                    )}
                  />
                  {index < steps.length - 1 && (
                    <div
                      className={cn(
                        "my-1 w-px flex-1 min-h-[2rem]",
                        index < currentStep ? "bg-[var(--primary)]" : "bg-[var(--border)]",
                      )}
                    />
                  )}
                </div>
                <div className={cn("pb-8", index === steps.length - 1 && "pb-0")}>
                  <p
                    className={cn(
                      "text-sm font-medium",
                      isComplete ? "text-[var(--foreground)]" : "text-[var(--muted)]",
                    )}
                  >
                    {step.label}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3">
        <OrderSavingsSummary
          total={totalAmount}
          discountTotal={discountTotal}
        />
      </div>
    </div>
  );
}
