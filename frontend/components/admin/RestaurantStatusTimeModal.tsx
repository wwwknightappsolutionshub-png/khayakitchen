"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ModalFrame } from "@/components/ui/ModalFrame";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { menuAdminService } from "@/services/menu-admin.service";
import type { PromoMealSelection } from "@/lib/types";
import { formatCurrency, cn, toNumber } from "@/lib/utils";

export type StatusTimerKind = "closing" | "promo";

export interface StatusTimerConfirmPayload {
  endsAt: string;
  promoMeals?: PromoMealSelection[];
}

function minDateTimeLocal(): string {
  const date = new Date();
  date.setMinutes(date.getMinutes() + 1);
  date.setSeconds(0, 0);
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60 * 1000);
  return local.toISOString().slice(0, 16);
}

function defaultDateTime(kind: StatusTimerKind): string {
  const date = new Date();
  date.setMinutes(date.getMinutes() + (kind === "closing" ? 30 : 120));
  date.setSeconds(0, 0);
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60 * 1000);
  return local.toISOString().slice(0, 16);
}

function toDateTimeLocal(iso?: string | null): string | undefined {
  if (!iso) return undefined;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return undefined;
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60 * 1000);
  return local.toISOString().slice(0, 16);
}

interface RestaurantStatusTimeModalProps {
  open: boolean;
  kind: StatusTimerKind;
  onClose: () => void;
  onConfirm: (payload: StatusTimerConfirmPayload) => void;
  isLoading?: boolean;
  initialEndsAt?: string | null;
  initialDiscountPercent?: number;
  initialMealIds?: string[];
}

export function RestaurantStatusTimeModal({
  open,
  kind,
  onClose,
  onConfirm,
  isLoading,
  initialEndsAt,
  initialDiscountPercent,
  initialMealIds,
}: RestaurantStatusTimeModalProps) {
  const [value, setValue] = useState(defaultDateTime(kind));
  const [discountPercent, setDiscountPercent] = useState("15");
  const [selectedMealIds, setSelectedMealIds] = useState<string[]>([]);

  const menuQuery = useQuery({
    queryKey: ["admin-menu", "promo-picker"],
    queryFn: () => menuAdminService.getAdminMenu(),
    enabled: open && kind === "promo",
  });

  const activeMeals = (menuQuery.data?.meals ?? []).filter((m) => m.is_active);

  useEffect(() => {
    if (open) {
      setValue(toDateTimeLocal(initialEndsAt) ?? defaultDateTime(kind));
      setDiscountPercent(String(initialDiscountPercent ?? 15));
      setSelectedMealIds(initialMealIds ?? []);
    }
  }, [open, kind, initialEndsAt, initialDiscountPercent, initialMealIds]);

  const title = kind === "closing" ? "Set closing time" : "Set promo & discounted meals";
  const description =
    kind === "closing"
      ? "Customers will see a countdown until the kitchen closes for orders."
      : "Pick menu items on discount and when the promo ends. Customers will see a scrolling promo section.";

  const parsedDate = value ? new Date(value) : null;
  const dateValid =
    parsedDate !== null && !Number.isNaN(parsedDate.getTime()) && parsedDate.getTime() > Date.now();
  const discount = Number(discountPercent);
  const discountValid = discount >= 1 && discount <= 90;
  const mealsValid = kind !== "promo" || selectedMealIds.length > 0;
  const isValid = dateValid && (kind !== "promo" || (discountValid && mealsValid));

  const toggleMeal = (mealId: string) => {
    setSelectedMealIds((prev) =>
      prev.includes(mealId) ? prev.filter((id) => id !== mealId) : [...prev, mealId],
    );
  };

  const handleConfirm = () => {
    if (!isValid || !parsedDate) return;
    const payload: StatusTimerConfirmPayload = { endsAt: parsedDate.toISOString() };
    if (kind === "promo") {
      payload.promoMeals = selectedMealIds.map((meal_id) => ({
        meal_id,
        discount_percent: discount,
      }));
    }
    onConfirm(payload);
  };

  return (
    <ModalFrame open={open} onClose={onClose} maxWidth="sm:max-w-xl">
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <p className="text-sm text-muted">{description}</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            label={kind === "closing" ? "Kitchen closes at" : "Promo ends at"}
            type="datetime-local"
            value={value}
            min={minDateTimeLocal()}
            onChange={(e) => setValue(e.target.value)}
          />

          {kind === "promo" && (
            <>
              <Input
                label="Discount (%)"
                type="number"
                min={1}
                max={90}
                value={discountPercent}
                onChange={(e) => setDiscountPercent(e.target.value)}
              />

              <div>
                <p className="mb-2 text-sm font-medium">Meals on discount</p>
                {menuQuery.isLoading && <p className="text-sm text-muted">Loading menu…</p>}
                {!menuQuery.isLoading && activeMeals.length === 0 && (
                  <p className="text-sm text-muted">No active menu items. Add meals first.</p>
                )}
                <div className="max-h-52 space-y-2 overflow-y-auto rounded-[var(--radius)] border border-border p-2">
                  {activeMeals.map((meal) => {
                    const selected = selectedMealIds.includes(meal.id);
                    const base = toNumber(meal.base_price);
                    const promo = Math.round(base * (1 - discount / 100) * 100) / 100;
                    return (
                      <label
                        key={meal.id}
                        className={cn(
                          "flex cursor-pointer items-center gap-3 rounded-[var(--radius)] border px-3 py-2 transition-colors",
                          selected
                            ? "border-primary bg-primary/10"
                            : "border-border hover:border-primary/30",
                        )}
                      >
                        <input
                          type="checkbox"
                          checked={selected}
                          onChange={() => toggleMeal(meal.id)}
                          className="accent-primary"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{meal.name}</p>
                          {discountValid && selected && (
                            <p className="text-xs text-muted">
                              {formatCurrency(promo)}{" "}
                              <span className="line-through">{formatCurrency(base)}</span>
                            </p>
                          )}
                        </div>
                      </label>
                    );
                  })}
                </div>
                {selectedMealIds.length > 0 && (
                  <p className="mt-1 text-xs text-muted">
                    {selectedMealIds.length} meal{selectedMealIds.length === 1 ? "" : "s"} selected
                  </p>
                )}
              </div>
            </>
          )}

          <div className="flex flex-wrap gap-2">
            <Button onClick={handleConfirm} isLoading={isLoading} disabled={!isValid}>
              Confirm status
            </Button>
            <Button variant="secondary" onClick={onClose} disabled={isLoading}>
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    </ModalFrame>
  );
}
