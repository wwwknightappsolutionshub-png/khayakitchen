"use client";

import { useState, useMemo } from "react";
import { ChevronLeft, Minus, Plus } from "lucide-react";
import { ModalPortal } from "@/components/ui/ModalPortal";
import { MealImage } from "@/components/customer/MealImage";
import { CustomerButton } from "@/components/customer/CustomerButton";
import { useCartStore } from "@/stores/cart-store";
import { useUiStore } from "@/stores/ui-store";
import {
  getRadioOptionGroups,
  getCheckboxOptionGroups,
} from "@/lib/meal-options";
import { formatCurrency, cn, toNumber } from "@/lib/utils";
import type { Meal, MealOption } from "@/lib/types";

const STEPS = ["Select Meal", "Configure Options", "Add Extras", "Add to Cart"] as const;

interface MealCustomizeFlowProps {
  meal: Meal;
  onClose: () => void;
  promoUnitPrice?: number;
  campaignId?: string | null;
}

export function MealCustomizeFlow({
  meal,
  onClose,
  promoUnitPrice,
  campaignId,
}: MealCustomizeFlowProps) {
  const addItem = useCartStore((s) => s.addItem);
  const triggerCartBounce = useUiStore((s) => s.triggerCartBounce);
  const [step, setStep] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [configureSelections, setConfigureSelections] = useState<Record<string, MealOption[]>>({});
  const [checkboxSelections, setCheckboxSelections] = useState<Record<string, MealOption[]>>({});

  const configureGroups = useMemo(() => getRadioOptionGroups(meal.options), [meal.options]);
  const checkboxGroups = useMemo(() => getCheckboxOptionGroups(meal.options), [meal.options]);

  const allSelectedOptions = useMemo(() => {
    const fromConfigure = Object.values(configureSelections).flat();
    const fromExtras = Object.values(checkboxSelections).flat();
    return [...fromConfigure, ...fromExtras];
  }, [configureSelections, checkboxSelections]);

  const baseUnit = promoUnitPrice ?? toNumber(meal.base_price);
  const listBase = toNumber(meal.base_price);
  const hasPromoPrice = baseUnit < listBase;
  const optionsTotal = allSelectedOptions.reduce((sum, o) => sum + toNumber(o.price_delta), 0);
  const lineTotal = (baseUnit + optionsTotal) * quantity;

  const toggleConfigure = (groupName: string, option: MealOption) => {
    setConfigureSelections((prev) => {
      const current = prev[groupName] ?? [];
      const exists = current.some((o) => o.id === option.id);
      return {
        ...prev,
        [groupName]: exists
          ? current.filter((o) => o.id !== option.id)
          : [...current, option],
      };
    });
  };

  const toggleCheckbox = (groupName: string, option: MealOption) => {
    setCheckboxSelections((prev) => {
      const current = prev[groupName] ?? [];
      const exists = current.some((o) => o.id === option.id);
      return {
        ...prev,
        [groupName]: exists
          ? current.filter((o) => o.id !== option.id)
          : [...current, option],
      };
    });
  };

  const handleAdd = () => {
    addItem({
      mealId: meal.id,
      mealName: meal.name,
      basePrice: baseUnit,
      originalBasePrice: hasPromoPrice ? listBase : undefined,
      campaignId: campaignId ?? null,
      quantity,
      selectedOptions: allSelectedOptions.map((o) => ({
        optionId: o.id,
        name: o.name,
        priceDelta: toNumber(o.price_delta),
      })),
    });
    triggerCartBounce();
    onClose();
  };

  const goNext = () => setStep((s) => Math.min(s + 1, STEPS.length - 1));
  const goBack = () => (step === 0 ? onClose() : setStep((s) => s - 1));

  return (
    <ModalPortal open onClose={onClose}>
      <div className="fixed inset-0 z-[200] flex items-end justify-center sm:items-center sm:p-4">
        <button
          type="button"
          className="absolute inset-0 bg-black/70 backdrop-blur-sm"
          onClick={onClose}
          aria-label="Close"
        />

        <div
          role="dialog"
          aria-modal="true"
          className="relative z-10 flex max-h-[min(92vh,720px)] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl bg-[var(--surface)] customer-animate-in sm:rounded-2xl"
        >
          <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
            <button
              type="button"
              onClick={goBack}
              className="customer-press flex items-center gap-1 text-sm text-[var(--muted)]"
            >
              <ChevronLeft className="h-4 w-4" />
              Back
            </button>
            <div className="flex gap-1.5">
              {STEPS.map((_, i) => (
                <span
                  key={i}
                  className={cn(
                    "h-1 w-6 rounded-full transition-colors",
                    i <= step ? "bg-[var(--primary)]" : "bg-[var(--border)]",
                  )}
                />
              ))}
            </div>
            <span className="w-12 text-right text-xs text-[var(--muted)]">
              {step + 1}/{STEPS.length}
            </span>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto">
            {step === 0 && (
              <div className="customer-animate-in">
                <MealImage
                  name={meal.name}
                  imageUrl={meal.image_url}
                  className="aspect-video w-full rounded-none"
                  sizes="100vw"
                />
                <div className="p-6">
                  <p className="text-xs font-medium uppercase tracking-wider text-[var(--muted)]">
                    Step 1 — Select Meal
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold leading-tight">{meal.name}</h2>
                  {meal.description && (
                    <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
                      {meal.description}
                    </p>
                  )}
                  <p className="price mt-4 text-xl text-[var(--primary)]">
                    {formatCurrency(meal.base_price)}
                  </p>
                </div>
              </div>
            )}

            {step === 1 && (
              <div className="customer-animate-in p-6">
                <p className="text-xs font-medium uppercase tracking-wider text-[var(--muted)]">
                  Step 2 — Configure Options
                </p>
                <h2 className="mt-2 text-lg font-semibold">{meal.name}</h2>

                {configureGroups.length === 0 ? (
                  <p className="mt-6 text-sm text-[var(--muted)]">
                    Standard preparation — no options to configure.
                  </p>
                ) : (
                  <div className="mt-6 space-y-6">
                    {configureGroups.map((group) => (
                      <div key={group.group}>
                        <h3 className="mb-1 text-sm font-semibold">{group.group}</h3>
                        <p className="mb-3 text-xs text-[var(--muted)]">Select one or more</p>
                        <div className="space-y-2">
                          {group.options.map((option) => {
                            const selected = (configureSelections[group.group] ?? []).some(
                              (o) => o.id === option.id,
                            );
                            return (
                              <button
                                key={option.id}
                                type="button"
                                onClick={() => toggleConfigure(group.group, option)}
                                className={cn(
                                  "customer-press flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm transition-colors duration-200",
                                  selected
                                    ? "border-[var(--primary)] bg-[var(--primary)]/10"
                                    : "border-[var(--border)] hover:border-[var(--primary)]/30",
                                )}
                              >
                                <span
                                  className={cn(
                                    "flex h-4 w-4 shrink-0 items-center justify-center rounded border",
                                    selected
                                      ? "border-[var(--primary)] bg-[var(--primary)]"
                                      : "border-[var(--muted)]",
                                  )}
                                >
                                  {selected && (
                                    <svg viewBox="0 0 12 12" className="h-3 w-3 text-[var(--background)]">
                                      <path
                                        fill="currentColor"
                                        d="M10.3 3.3a1 1 0 0 1 0 1.4l-5 5a1 1 0 0 1-1.4 0l-2.5-2.5a1 1 0 1 1 1.4-1.4L4.6 7.6l4.3-4.3a1 1 0 0 1 1.4 0z"
                                      />
                                    </svg>
                                  )}
                                </span>
                                <span className="flex-1">{option.name}</span>
                                {toNumber(option.price_delta) > 0 && (
                                  <span className="price text-[var(--muted)]">
                                    +{formatCurrency(option.price_delta)}
                                  </span>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {step === 2 && (
              <div className="customer-animate-in p-6">
                <p className="text-xs font-medium uppercase tracking-wider text-[var(--muted)]">
                  Step 3 — Add Extras
                </p>
                <h2 className="mt-2 text-lg font-semibold">{meal.name}</h2>

                {checkboxGroups.length === 0 ? (
                  <p className="mt-6 text-sm text-[var(--muted)]">
                    No extras available for this dish.
                  </p>
                ) : (
                  <div className="mt-6 space-y-6">
                    {checkboxGroups.map((group) => (
                      <div key={group.group}>
                        <h3 className="mb-3 text-sm font-semibold">{group.group}</h3>
                        <div className="space-y-2">
                          {group.options.map((option) => {
                            const selected = (checkboxSelections[group.group] ?? []).some(
                              (o) => o.id === option.id,
                            );
                            return (
                              <button
                                key={option.id}
                                type="button"
                                onClick={() => toggleCheckbox(group.group, option)}
                                className={cn(
                                  "customer-press flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm transition-colors duration-200",
                                  selected
                                    ? "border-[var(--secondary)] bg-[var(--secondary)]/10"
                                    : "border-[var(--border)] hover:border-[var(--secondary)]/30",
                                )}
                              >
                                <span
                                  className={cn(
                                    "flex h-4 w-4 shrink-0 items-center justify-center rounded border",
                                    selected
                                      ? "border-[var(--secondary)] bg-[var(--secondary)]"
                                      : "border-[var(--muted)]",
                                  )}
                                >
                                  {selected && (
                                    <svg viewBox="0 0 12 12" className="h-3 w-3 text-[var(--background)]">
                                      <path
                                        fill="currentColor"
                                        d="M10.3 3.3a1 1 0 0 1 0 1.4l-5 5a1 1 0 0 1-1.4 0l-2.5-2.5a1 1 0 1 1 1.4-1.4L4.6 7.6l4.3-4.3a1 1 0 0 1 1.4 0z"
                                      />
                                    </svg>
                                  )}
                                </span>
                                <span className="flex-1">{option.name}</span>
                                {toNumber(option.price_delta) > 0 && (
                                  <span className="price text-[var(--muted)]">
                                    +{formatCurrency(option.price_delta)}
                                  </span>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {step === 3 && (
              <div className="customer-animate-in p-6">
                <p className="text-xs font-medium uppercase tracking-wider text-[var(--muted)]">
                  Step 4 — Add to Cart
                </p>
                <h2 className="mt-2 text-lg font-semibold">Review your order</h2>

                <div className="mt-6 rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] p-4">
                  <p className="font-semibold">{meal.name}</p>
                  {allSelectedOptions.length > 0 && (
                    <ul className="mt-2 space-y-1 text-sm text-[var(--muted)]">
                      {allSelectedOptions.map((o) => (
                        <li key={o.id} className="flex justify-between gap-2">
                          <span>{o.name}</span>
                          {toNumber(o.price_delta) > 0 && (
                            <span className="price">+{formatCurrency(o.price_delta)}</span>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                  <div className="mt-4 flex items-center justify-between border-t border-[var(--border)] pt-4">
                    <span className="text-sm text-[var(--muted)]">Quantity</span>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                        className="customer-press flex h-9 w-9 items-center justify-center rounded-full border border-[var(--border)]"
                      >
                        <Minus className="h-4 w-4" />
                      </button>
                      <span className="price w-6 text-center text-lg">{quantity}</span>
                      <button
                        type="button"
                        onClick={() => setQuantity((q) => q + 1)}
                        className="customer-press flex h-9 w-9 items-center justify-center rounded-full border border-[var(--border)]"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between">
                  <span className="text-[var(--muted)]">Total</span>
                  <span className="price text-2xl text-[var(--primary)]">
                    {formatCurrency(lineTotal)}
                  </span>
                </div>
              </div>
            )}
          </div>

          <div className="shrink-0 border-t border-[var(--border)] p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
            {step < STEPS.length - 1 ? (
              <CustomerButton className="w-full" size="lg" onClick={goNext}>
                Continue
              </CustomerButton>
            ) : (
              <CustomerButton className="w-full" size="lg" onClick={handleAdd}>
                Add to Cart — {formatCurrency(lineTotal)}
              </CustomerButton>
            )}
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}
