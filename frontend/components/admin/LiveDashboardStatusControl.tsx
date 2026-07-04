"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { tenantBrandingService } from "@/services/tenant-branding.service";
import type { RestaurantOperationalStatus } from "@/lib/types";
import { cn } from "@/lib/utils";
import {
  RestaurantStatusTimeModal,
  type StatusTimerConfirmPayload,
  type StatusTimerKind,
} from "@/components/admin/RestaurantStatusTimeModal";

const OPTIONS: {
  value: RestaurantOperationalStatus;
  label: string;
  emoji: string;
  description?: string;
}[] = [
  { value: "open", label: "Open", emoji: "🟢", description: "Orders allowed, normal UI" },
  {
    value: "closing_soon",
    label: "Closing Soon",
    emoji: "🟠",
    description: "Orders allowed, closing countdown",
  },
  { value: "closed", label: "Closed", emoji: "🔴", description: "Orders disabled" },
  {
    value: "promo_mode",
    label: "Promo Mode",
    emoji: "🔥",
    description: "Discounted meals + countdown on storefront",
  },
];

interface LiveDashboardStatusControlProps {
  currentStatus?: RestaurantOperationalStatus;
  isAcceptingOrders?: boolean;
  disabled?: boolean;
  showDescriptions?: boolean;
}

export function LiveDashboardStatusControl({
  currentStatus = "open",
  isAcceptingOrders = true,
  disabled = false,
  showDescriptions = false,
}: LiveDashboardStatusControlProps) {
  const queryClient = useQueryClient();
  const [timerKind, setTimerKind] = useState<StatusTimerKind | null>(null);

  const mutation = useMutation({
    mutationFn: tenantBrandingService.updateRestaurantStatus,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["restaurant-status"] });
      queryClient.invalidateQueries({ queryKey: ["storefront"] });
      queryClient.invalidateQueries({ queryKey: ["analytics"] });
      setTimerKind(null);
    },
  });

  const handleStatusClick = (value: RestaurantOperationalStatus) => {
    if (disabled || mutation.isPending) return;

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

  return (
    <>
      <div className="space-y-3">
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {OPTIONS.map((option) => {
            const active = currentStatus === option.value;
            return (
              <button
                key={option.value}
                type="button"
                disabled={disabled || mutation.isPending}
                onClick={() => handleStatusClick(option.value)}
                className={cn(
                  "rounded-[var(--radius)] border px-4 py-3 text-left text-sm font-medium transition-colors",
                  active
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-surface-elevated hover:border-primary/30",
                  disabled && "cursor-not-allowed opacity-60",
                )}
              >
                <p className="font-medium">
                  <span className="mr-1.5">{option.emoji}</span>
                  {option.label}
                </p>
                {showDescriptions && option.description ? (
                  <p className="mt-1 text-xs font-normal text-muted">{option.description}</p>
                ) : null}
              </button>
            );
          })}
        </div>
        <p className="text-xs text-muted">
          {isAcceptingOrders ? "Accepting orders" : "Orders paused"}
          {currentStatus === "closing_soon" ? " · closing countdown active on customer app" : ""}
          {currentStatus === "promo_mode" ? " · promo meals scrolling on customer app" : ""}
        </p>
      </div>

      <RestaurantStatusTimeModal
        open={timerKind !== null}
        kind={timerKind ?? "closing"}
        onClose={() => setTimerKind(null)}
        onConfirm={handleTimerConfirm}
        isLoading={mutation.isPending}
      />
    </>
  );
}

export { OPTIONS as RESTAURANT_STATUS_OPTIONS };
