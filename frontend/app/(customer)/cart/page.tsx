"use client";

import { CustomerRouteLink } from "@/components/customer/CustomerRouteLink";
import { Minus, Plus, ArrowRight } from "lucide-react";
import { CustomerButton } from "@/components/customer/CustomerButton";
import { useCartStore, getOptionsKey, getLinePrice } from "@/stores/cart-store";
import { useStorefront } from "@/hooks/useStorefront";
import { OrderSavingsSummary } from "@/components/customer/OrderSavingsSummary";
import { formatCurrency } from "@/lib/utils";

export default function CartPage() {
  const { items, updateQuantity, removeItem, getTotal } = useCartStore();
  const total = getTotal();
  const { data: storefront } = useStorefront();
  const isClosed = storefront?.status?.is_accepting_orders === false;

  if (items.length === 0) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center customer-animate-in">
        <p className="mb-2 text-4xl">🍽️</p>
        <h1 className="text-xl font-semibold">Your cart is empty</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">Browse the menu to add something delicious</p>
        <CustomerRouteLink href="/menu" className="mt-8">
          <CustomerButton>Browse Menu</CustomerButton>
        </CustomerRouteLink>
      </div>
    );
  }

  return (
    <div className="customer-animate-in px-4 pt-6">
      <h1 className="mb-6 text-2xl font-bold tracking-tight">Your Cart</h1>

      <div className="space-y-3">
        {items.map((item) => {
          const optionsKey = getOptionsKey(item.selectedOptions);
          const linePrice = getLinePrice(item);
          const unitPrice = linePrice / item.quantity;

          return (
            <div
              key={`${item.mealId}-${optionsKey}`}
              className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold">{item.mealName}</h3>
                  {item.selectedOptions.length > 0 && (
                    <ul className="mt-2 space-y-0.5 text-sm text-[var(--muted)]">
                      {item.selectedOptions.map((o) => (
                        <li key={o.optionId}>
                          {o.name}
                          {o.priceDelta > 0 && (
                            <span className="price ml-1">+{formatCurrency(o.priceDelta)}</span>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                  <p className="price mt-2 text-[var(--primary)]">
                    {formatCurrency(unitPrice)} each
                    {item.originalBasePrice && item.originalBasePrice > item.basePrice && (
                      <span className="ml-2 text-sm text-[var(--muted)] line-through">
                        {formatCurrency(item.originalBasePrice)}
                      </span>
                    )}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => removeItem(item.mealId, optionsKey)}
                  className="text-xs text-[var(--muted)] underline-offset-2 hover:text-[var(--primary)] hover:underline"
                >
                  Remove
                </button>
              </div>

              <div className="mt-4 flex items-center justify-between border-t border-[var(--border)] pt-3">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => updateQuantity(item.mealId, optionsKey, item.quantity - 1)}
                    className="customer-press flex h-8 w-8 items-center justify-center rounded-full border border-[var(--border)]"
                  >
                    <Minus className="h-3.5 w-3.5" />
                  </button>
                  <span className="price w-4 text-center font-medium">{item.quantity}</span>
                  <button
                    type="button"
                    onClick={() => updateQuantity(item.mealId, optionsKey, item.quantity + 1)}
                    className="customer-press flex h-8 w-8 items-center justify-center rounded-full border border-[var(--border)]"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>
                <span className="price font-semibold">{formatCurrency(linePrice)}</span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-8 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
        <OrderSavingsSummary items={items} total={total} />
      </div>

      <CustomerRouteLink href={isClosed ? "/menu" : "/checkout"} className="mt-6 block">
        <CustomerButton className="w-full" size="lg" disabled={isClosed}>
          {isClosed ? "Currently closed" : "Continue to Checkout"}
          {!isClosed && <ArrowRight className="h-4 w-4" />}
        </CustomerButton>
      </CustomerRouteLink>
    </div>
  );
}
