"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { tenantBrandingService } from "@/services/tenant-branding.service";
import type { PromoMealItem, RestaurantOperationalStatus } from "@/lib/types";
import { ApiClientError } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import { StatusCountdown } from "@/components/customer/StatusCountdown";
import {
  RestaurantStatusTimeModal,
  type StatusTimerConfirmPayload,
  type StatusTimerKind,
} from "@/components/admin/RestaurantStatusTimeModal";

const OPTIONS: {
  value: RestaurantOperationalStatus;
  label: string;
  emoji: string;
  hint: string;
  accent: string;
}[] = [
  {
    value: "open",
    label: "Open",
    emoji: "🟢",
    hint: "Normal service",
    accent: "border-emerald-500/50 bg-emerald-500/10 text-emerald-400",
  },
  {
    value: "closing_soon",
    label: "Closing Soon",
    emoji: "🟠",
    hint: "Countdown timer",
    accent: "border-amber-500/50 bg-amber-500/10 text-amber-400",
  },
  {
    value: "closed",
    label: "Closed",
    emoji: "🔴",
    hint: "Pause orders",
    accent: "border-red-500/50 bg-red-500/10 text-red-400",
  },
  {
    value: "promo_mode",
    label: "Promo",
    emoji: "🔥",
    hint: "Discounted meals",
    accent: "border-primary/50 bg-primary/10 text-primary",
  },
];

interface LiveDashboardStatusControlProps {
  currentStatus?: RestaurantOperationalStatus;
  isAcceptingOrders?: boolean;
  closingAt?: string | null;
  promoEndsAt?: string | null;
  promoMeals?: PromoMealItem[];
  disabled?: boolean;
  showDescriptions?: boolean;
}

export function LiveDashboardStatusControl({
  currentStatus = "open",
  isAcceptingOrders = true,
  closingAt,
  promoEndsAt,
  promoMeals,
  disabled = false,
  showDescriptions = false,
}: LiveDashboardStatusControlProps) {
  const queryClient = useQueryClient();
  const [timerKind, setTimerKind] = useState<StatusTimerKind | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: tenantBrandingService.updateRestaurantStatus,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["restaurant-status"] });
      queryClient.invalidateQueries({ queryKey: ["storefront"] });
      queryClient.invalidateQueries({ queryKey: ["analytics"] });
      setTimerKind(null);
      setErrorMessage(null);
    },
    onError: (err) => {
      setErrorMessage(err instanceof ApiClientError ? err.message : "Could not update status.");
    },
  });

  const handleStatusClick = (value: RestaurantOperationalStatus) => {
    if (disabled || mutation.isPending) return;
    setErrorMessage(null);

    if (value === "closing_soon") {
      setTimerKind("closing");
      return;
    }
    if (value === "promo_mode") {
      setTimerKind("promo");
      return;
    }

    mutation.mutate({ status: value });
  };

  const handleTimerConfirm = (payload: StatusTimerConfirmPayload) => {
    if (timerKind === "closing") {
      mutation.mutate({ status: "closing_soon", closing_at: payload.endsAt });
      return;
    }
    mutation.mutate({
      status: "promo_mode",
      promo_ends_at: payload.endsAt,
      promo_meals: payload.promoMeals,
    });
  };

  const activeOption = OPTIONS.find((o) => o.value === currentStatus) ?? OPTIONS[0];
  const promoMealCount = promoMeals?.length ?? 0;

  return (
    <>
      <div className="space-y-4">
        <div
          className={cn(
            "rounded-[var(--radius)] border px-3 py-2.5",
            activeOption.accent,
          )}
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-sm font-semibold">
                <span className="mr-1.5">{activeOption.emoji}</span>
                {activeOption.label}
              </p>
              <p className="text-xs opacity-80">
                {isAcceptingOrders ? "Accepting orders" : "Orders paused"}
                {showDescriptions && activeOption.hint ? ` · ${activeOption.hint}` : ""}
              </p>
            </div>
            {currentStatus === "closing_soon" && closingAt ? (
              <div className="rounded-full border border-current/30 px-2.5 py-1 text-[11px] font-semibold">
                Closes{" "}
                <StatusCountdown
                  endsAt={closingAt}
                  expiredLabel="now"
                  className="font-mono tabular-nums"
                />
              </div>
            ) : null}
            {currentStatus === "promo_mode" && promoEndsAt ? (
              <div className="rounded-full border border-current/30 px-2.5 py-1 text-[11px] font-semibold">
                Ends{" "}
                <StatusCountdown
                  endsAt={promoEndsAt}
                  expiredLabel="now"
                  className="font-mono tabular-nums"
                />
                {promoMealCount > 0 ? (
                  <span className="ml-1 opacity-80">
                    · {promoMealCount} meal{promoMealCount === 1 ? "" : "s"}
                  </span>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {OPTIONS.map((option) => {
            const active = currentStatus === option.value;
            const needsSetup = option.value === "closing_soon" || option.value === "promo_mode";

            return (
              <button
                key={option.value}
                type="button"
                disabled={disabled || mutation.isPending}
                onClick={() => handleStatusClick(option.value)}
                className={cn(
                  "flex min-h-[4.5rem] flex-col items-center justify-center gap-1 rounded-[var(--radius)] border px-2 py-3 text-center transition-colors",
                  active
                    ? "border-primary bg-primary/10 ring-1 ring-primary/40"
                    : "border-border bg-surface-elevated hover:border-primary/30 hover:bg-surface",
                  disabled && "cursor-not-allowed opacity-60",
                )}
              >
                <span className="text-xl leading-none" aria-hidden>
                  {option.emoji}
                </span>
                <span className="text-xs font-semibold leading-tight text-foreground">
                  {option.label}
                </span>
                {needsSetup ? (
                  <span className="text-[10px] leading-tight text-muted">Set timer</span>
                ) : (
                  <span className="text-[10px] leading-tight text-muted">{option.hint}</span>
                )}
              </button>
            );
          })}
        </div>

        {disabled ? (
          <p className="text-xs text-muted">Only owners can change restaurant status.</p>
        ) : (
          <p className="text-xs text-muted">
            Closing Soon and Promo open a setup dialog. Customers see countdowns and promo meals on
            the menu.
          </p>
        )}

        {errorMessage ? (
          <p className="rounded-[var(--radius)] border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-400">
            {errorMessage}
          </p>
        ) : null}
      </div>

      <RestaurantStatusTimeModal
        open={timerKind !== null}
        kind={timerKind ?? "closing"}
        onClose={() => setTimerKind(null)}
        onConfirm={handleTimerConfirm}
        isLoading={mutation.isPending}
        initialEndsAt={
          timerKind === "closing"
            ? closingAt ?? undefined
            : timerKind === "promo"
              ? promoEndsAt ?? undefined
              : undefined
        }
        initialDiscountPercent={
          timerKind === "promo" && promoMeals?.[0]?.discount_percent
            ? promoMeals[0].discount_percent
            : undefined
        }
        initialMealIds={
          timerKind === "promo" ? (promoMeals?.map((m) => m.meal_id) ?? []) : undefined
        }
      />
    </>
  );
}

export { OPTIONS as RESTAURANT_STATUS_OPTIONS };
