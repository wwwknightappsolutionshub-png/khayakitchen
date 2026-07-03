"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { tenantBrandingService } from "@/services/tenant-branding.service";
import type { RestaurantOperationalStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

const OPTIONS: {
  value: RestaurantOperationalStatus;
  label: string;
  emoji: string;
}[] = [
  { value: "open", label: "Open", emoji: "🟢" },
  { value: "closing_soon", label: "Closing Soon", emoji: "🟠" },
  { value: "closed", label: "Closed", emoji: "🔴" },
  { value: "promo_mode", label: "Promo Mode", emoji: "🔥" },
];

interface LiveDashboardStatusControlProps {
  currentStatus?: RestaurantOperationalStatus;
  isAcceptingOrders?: boolean;
}

export function LiveDashboardStatusControl({
  currentStatus = "open",
  isAcceptingOrders = true,
}: LiveDashboardStatusControlProps) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (status: RestaurantOperationalStatus) =>
      tenantBrandingService.updateRestaurantStatus({ status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["restaurant-status"] });
      queryClient.invalidateQueries({ queryKey: ["storefront"] });
      queryClient.invalidateQueries({ queryKey: ["analytics"] });
    },
  });

  return (
    <div className="space-y-3">
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {OPTIONS.map((option) => {
          const active = currentStatus === option.value;
          return (
            <button
              key={option.value}
              type="button"
              disabled={mutation.isPending}
              onClick={() => mutation.mutate(option.value)}
              className={cn(
                "rounded-[var(--radius)] border px-4 py-3 text-left text-sm font-medium transition-colors",
                active
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-surface-elevated hover:border-primary/30",
              )}
            >
              <span className="mr-1.5">{option.emoji}</span>
              {option.label}
            </button>
          );
        })}
      </div>
      <p className="text-xs text-muted">
        {isAcceptingOrders ? "Accepting orders" : "Orders paused"} · updates via restaurant status API
      </p>
    </div>
  );
}
