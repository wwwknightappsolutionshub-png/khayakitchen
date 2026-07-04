"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Package, Gift } from "lucide-react";
import { CustomerButton } from "@/components/customer/CustomerButton";
import { CustomerInput } from "@/components/customer/CustomerInput";
import { useCartStore } from "@/stores/cart-store";
import { customerOrdersService } from "@/services/customer-orders.service";
import { loyaltyService } from "@/services/loyalty.service";
import { formatCurrency, formatDate } from "@/lib/utils";

const PHONE_STORAGE_KEY = "khayaos-customer-phone";
const NAME_STORAGE_KEY = "khayaos-customer-name";
const WELCOME_STORAGE_KEY = "khayaos-welcome-seen";

function readStoredPhone(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(PHONE_STORAGE_KEY) ?? "";
}

export default function AccountPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isSignup = searchParams.get("signup") === "1";
  const activeOrderId = useCartStore((s) => s.activeOrderId);
  const loadOrderIntoCart = useCartStore((s) => s.loadOrderIntoCart);
  const [name, setName] = useState(() => {
    if (typeof window === "undefined") return "";
    return localStorage.getItem(NAME_STORAGE_KEY) ?? "";
  });
  const [phone, setPhone] = useState(readStoredPhone);
  const [submittedPhone, setSubmittedPhone] = useState<string | null>(() => {
    const stored = readStoredPhone();
    return stored || null;
  });
  const [reorderTarget, setReorderTarget] = useState<string | null>(null);
  const [reorderLoading, setReorderLoading] = useState(false);
  const [reorderError, setReorderError] = useState<string | null>(null);

  const { data: ordersData, isLoading: ordersLoading } = useQuery({
    queryKey: ["customer-orders", submittedPhone],
    queryFn: () => customerOrdersService.getOrders(submittedPhone!),
    enabled: !!submittedPhone,
  });

  const customerId = ordersData?.customer_id;

  const { data: loyaltyData } = useQuery({
    queryKey: ["loyalty", customerId, submittedPhone],
    queryFn: () => loyaltyService.getCustomerAccount(customerId!, submittedPhone!),
    enabled: !!customerId && !!submittedPhone,
  });

  const orders = ordersData?.orders ?? [];
  const points = loyaltyData?.loyalty?.points_balance ?? 0;
  const tierTarget = 100;
  const progress = Math.min((points / tierTarget) * 100, 100);

  const loadHistory = () => {
    const trimmed = phone.trim();
    if (!trimmed) return;
    localStorage.setItem(PHONE_STORAGE_KEY, trimmed);
    setSubmittedPhone(trimmed);
  };

  const completeSignup = () => {
    const trimmedPhone = phone.trim();
    const trimmedName = name.trim();
    if (!trimmedPhone || !trimmedName) return;
    localStorage.setItem(PHONE_STORAGE_KEY, trimmedPhone);
    localStorage.setItem(NAME_STORAGE_KEY, trimmedName);
    localStorage.setItem(WELCOME_STORAGE_KEY, "1");
    setSubmittedPhone(trimmedPhone);
    router.replace("/home");
  };

  const handleOrderAgain = async (orderId: string) => {
    if (!submittedPhone) return;
    setReorderLoading(true);
    setReorderError(null);
    try {
      const { order } = await customerOrdersService.getOrder(orderId, submittedPhone);
      if (!order.items?.length) {
        setReorderError("This order has no items to reorder.");
        return;
      }
      loadOrderIntoCart(order);
      setReorderTarget(null);
      router.push("/cart");
    } catch {
      setReorderError("Could not load order details. Try again.");
    } finally {
      setReorderLoading(false);
    }
  };

  return (
    <div className="customer-animate-in px-4 pt-6">
      <header className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">
          {isSignup ? "Create your account" : "Account"}
        </h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          {isSignup
            ? "Save your details for faster checkout and order tracking"
            : "Track orders and manage preferences"}
        </p>
      </header>

      {activeOrderId && (
        <Link
          href={`/tracking?id=${activeOrderId}`}
          className="mb-4 flex items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 transition-colors duration-200 hover:border-[var(--primary)]/30"
        >
          <Package className="h-5 w-5 text-[var(--primary)]" />
          <div>
            <p className="font-medium">Active order</p>
            <p className="text-xs text-[var(--muted)]">#{activeOrderId.slice(0, 8).toUpperCase()}</p>
          </div>
        </Link>
      )}

      <div className="mb-6 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
        {isSignup && (
          <>
            <label className="mb-2 block text-sm font-medium">Your name</label>
            <CustomerInput
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Jane Doe"
              className="mb-4 w-full"
            />
          </>
        )}
        <label className="mb-2 block text-sm font-medium">Your phone number</label>
        <div className="flex gap-2">
          <CustomerInput
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+44..."
            className="flex-1"
          />
          {isSignup ? (
            <CustomerButton
              onClick={completeSignup}
              disabled={!phone.trim() || !name.trim()}
            >
              Sign up
            </CustomerButton>
          ) : (
            <CustomerButton onClick={loadHistory} disabled={!phone.trim()}>
              Load
            </CustomerButton>
          )}
        </div>
        <p className="mt-2 text-xs text-[var(--muted)]">
          {isSignup
            ? "Saved on this device for checkout and loyalty"
            : "Saved on this device to show your order history"}
        </p>
      </div>

      {submittedPhone && customerId && (
        <div className="mb-6 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
          <div className="mb-3 flex items-center gap-2">
            <Gift className="h-5 w-5 text-[var(--secondary)]" />
            <h2 className="font-semibold">Loyalty rewards</h2>
          </div>
          <div className="mb-2 flex justify-between text-sm">
            <span className="text-[var(--muted)]">{points} points</span>
            <span className="text-[var(--muted)]">{tierTarget} for next reward</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-[var(--surface-elevated)]">
            <div
              className="h-full rounded-full bg-[var(--secondary)] transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
          {loyaltyData?.loyalty?.tier && (
            <p className="mt-2 text-xs capitalize text-[var(--muted)]">
              Tier: {loyaltyData.loyalty.tier}
            </p>
          )}
        </div>
      )}

      {submittedPhone && (
        <div className="mb-6">
          <h2 className="mb-3 font-semibold">Order history</h2>
          {ordersLoading && (
            <p className="text-sm text-[var(--muted)]">Loading orders…</p>
          )}
          {!ordersLoading && orders.length === 0 && (
            <p className="text-sm text-[var(--muted)]">No orders found for this number</p>
          )}
          <div className="space-y-2">
            {orders.map((order) => (
              <div
                key={order.id}
                className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <Link
                    href={`/tracking?id=${order.id}`}
                    className="min-w-0 flex-1 transition-colors hover:text-[var(--primary)]"
                  >
                    <p className="font-medium">#{order.id.slice(0, 8).toUpperCase()}</p>
                    <p className="text-xs capitalize text-[var(--muted)]">
                      {order.status.replace(/_/g, " ")} · {order.order_type}
                    </p>
                    <p className="font-mono text-sm">{formatCurrency(order.total_amount)}</p>
                    <p className="text-xs text-[var(--muted)]">{formatDate(order.created_at)}</p>
                  </Link>
                  <CustomerButton
                    variant="secondary"
                    className="shrink-0 text-xs"
                    onClick={() => {
                      setReorderError(null);
                      setReorderTarget(order.id);
                    }}
                    disabled={reorderLoading}
                  >
                    Order again
                  </CustomerButton>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {reorderTarget && (
        <div className="fixed inset-0 z-[200] flex items-end justify-center bg-black/70 p-4 sm:items-center">
          <div className="w-full max-w-sm rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 customer-animate-in">
            <h2 className="text-lg font-semibold">Order again?</h2>
            <p className="mt-2 text-sm text-[var(--muted)]">
              We&apos;ll add your previous items to the cart so you can review before checkout.
            </p>
            {reorderError && (
              <p className="mt-3 text-sm text-red-400">{reorderError}</p>
            )}
            <div className="mt-6 flex gap-2">
              <CustomerButton variant="ghost" className="flex-1" onClick={() => setReorderTarget(null)}>
                Cancel
              </CustomerButton>
              <CustomerButton
                className="flex-1"
                isLoading={reorderLoading}
                onClick={() => handleOrderAgain(reorderTarget)}
              >
                Add to cart
              </CustomerButton>
            </div>
          </div>
        </div>
      )}

      <Link href="/tracking">
        <CustomerButton variant="secondary" className="w-full">
          Track Orders
        </CustomerButton>
      </Link>

      <p className="mt-8 text-center text-xs text-[var(--muted)]">
        Business owner?{" "}
        <Link href="/login" className="text-[var(--secondary)] underline-offset-2 hover:underline">
          Admin login
        </Link>
      </p>
    </div>
  );
}
