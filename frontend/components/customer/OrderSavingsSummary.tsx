"use client";

import { formatCurrency } from "@/lib/utils";
import type { CartItem } from "@/lib/types";
import { getCartSavings, getCartSubtotalBeforeDiscount, getLineOriginalPrice } from "@/stores/cart-store";

interface OrderSavingsSummaryProps {
  items?: CartItem[];
  total: number;
  discountTotal?: number;
  className?: string;
}

export function OrderSavingsSummary({
  items,
  total,
  discountTotal,
  className,
}: OrderSavingsSummaryProps) {
  const savingsFromItems = items ? getCartSavings(items) : 0;
  const savings = discountTotal ?? savingsFromItems;
  const subtotalBefore =
    items && savingsFromItems > 0
      ? getCartSubtotalBeforeDiscount(items)
      : savings > 0
        ? total + savings
        : total;

  if (savings <= 0) {
    return (
      <div className={className}>
        <div className="flex justify-between border-t border-[var(--border)] pt-3">
          <span className="font-semibold">Total</span>
          <span className="price text-lg text-[var(--primary)]">{formatCurrency(total)}</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-2 ${className ?? ""}`}>
      <div className="flex justify-between text-sm">
        <span className="text-[var(--muted)]">Subtotal</span>
        <span className="price line-through text-[var(--muted)]">{formatCurrency(subtotalBefore)}</span>
      </div>
      <div className="flex justify-between text-sm text-emerald-400">
        <span>Campaign savings</span>
        <span className="price">−{formatCurrency(savings)}</span>
      </div>
      <div className="flex justify-between border-t border-[var(--border)] pt-3">
        <span className="font-semibold">Total</span>
        <span className="price text-lg text-[var(--primary)]">{formatCurrency(total)}</span>
      </div>
    </div>
  );
}
