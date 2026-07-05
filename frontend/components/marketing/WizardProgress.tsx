"use client";

import { cn } from "@/lib/utils";
import { marketingTheme } from "@/lib/marketing-theme";

interface WizardProgressProps {
  steps: string[];
  currentStep: number;
}

export function WizardProgress({ steps, currentStep }: WizardProgressProps) {
  return (
    <div className="mb-8">
      <div className="flex items-center justify-between gap-2">
        {steps.map((label, index) => {
          const isComplete = index < currentStep;
          const isCurrent = index === currentStep;

          return (
            <div key={label} className="flex min-w-0 flex-1 flex-col items-center gap-2">
              <div
                className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-full border text-sm font-semibold transition-colors",
                  isComplete && marketingTheme.stepComplete,
                  isCurrent && marketingTheme.stepCurrent,
                  !isComplete && !isCurrent && marketingTheme.stepPending,
                )}
              >
                {index + 1}
              </div>
              <p
                className={cn(
                  "hidden text-center text-[11px] font-medium sm:block",
                  isCurrent ? "text-amber-50" : "text-zinc-500",
                )}
              >
                {label}
              </p>
            </div>
          );
        })}
      </div>
      <div className="mt-4 h-1 overflow-hidden rounded-full bg-white/10">
        <div
          className={cn("h-full rounded-full transition-all duration-300", marketingTheme.progressBar)}
          style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
        />
      </div>
    </div>
  );
}
