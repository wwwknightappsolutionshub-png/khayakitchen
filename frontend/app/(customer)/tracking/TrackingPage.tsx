"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CustomerRouteLink } from "@/components/customer/CustomerRouteLink";
import { OrderStatusTracker } from "@/components/customer/OrderStatusTracker";
import { CustomerButton } from "@/components/customer/CustomerButton";
import { CustomerInput } from "@/components/customer/CustomerInput";
import { useOrderTracking } from "@/hooks/useOrderTracking";
import { useCartStore } from "@/stores/cart-store";
import { useToast } from "@/providers/ToastProvider";
import {
  consumeInstallClaimToast,
  detectPwaInstalled,
  requestPwaInstallUi,
  tryClaimPwaInstallReward,
} from "@/lib/pwa-install";

const PHONE_STORAGE_KEY = "khayaos-customer-phone";

function TrackingSkeleton() {
  return (
    <div className="space-y-4 px-4 pt-6">
      <div className="customer-shimmer mx-auto h-8 w-48 rounded" />
      <div className="customer-shimmer h-64 w-full rounded-2xl" />
      <div className="customer-shimmer h-12 w-full rounded-xl" />
    </div>
  );
}

export default function TrackingPage() {
  const searchParams = useSearchParams();
  const { showToast } = useToast();
  const storedOrderId = useCartStore((s) => s.activeOrderId);
  const orderId = searchParams.get("id") ?? storedOrderId;
  const [phoneDraft, setPhoneDraft] = useState(() => {
    if (typeof window === "undefined") return "";
    return localStorage.getItem(PHONE_STORAGE_KEY) ?? "";
  });
  const [phoneReady, setPhoneReady] = useState(() => {
    if (typeof window === "undefined") return false;
    return Boolean(localStorage.getItem(PHONE_STORAGE_KEY)?.trim());
  });

  const { data, isLoading, error, refetch } = useOrderTracking(phoneReady ? orderId : null);

  useEffect(() => {
    const payload = consumeInstallClaimToast();
    if (!payload) return;

    const points = payload.points || 200;
    showToast(
      "Thanks for your order",
      `We have rewarded you with ${points} free tokens, install our app and claim now`,
      {
        actionLabel: "Install now",
        onAction: () => requestPwaInstallUi(),
        durationMs: 14_000,
      },
    );
  }, [showToast]);

  useEffect(() => {
    void (async () => {
      if (await detectPwaInstalled("customer")) {
        await tryClaimPwaInstallReward();
      }
    })();
  }, []);

  const savePhoneAndLoad = () => {
    const trimmed = phoneDraft.trim();
    if (!trimmed) return;
    localStorage.setItem(PHONE_STORAGE_KEY, trimmed);
    setPhoneReady(true);
    void refetch();
  };

  if (!orderId) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center customer-animate-in">
        <h1 className="text-xl font-semibold">No active order</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">Place an order to track it here</p>
        <CustomerRouteLink href="/menu" className="mt-6">
          <CustomerButton>Order Now</CustomerButton>
        </CustomerRouteLink>
      </div>
    );
  }

  return (
    <div className="customer-animate-in px-4 pt-6">
      <header className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Order Tracking</h1>
      </header>

      {!phoneReady && (
        <div className="mb-6 space-y-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
          <p className="text-sm text-[var(--muted)]">
            Enter the phone number used at checkout to load this order.
          </p>
          <CustomerInput
            label="Phone number"
            type="tel"
            value={phoneDraft}
            onChange={(e) => setPhoneDraft(e.target.value)}
          />
          <CustomerButton className="w-full" onClick={savePhoneAndLoad} disabled={!phoneDraft.trim()}>
            Load order
          </CustomerButton>
        </div>
      )}

      {phoneReady && isLoading && <TrackingSkeleton />}

      {phoneReady && error && !data && (
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-6 py-10 text-center text-sm text-[var(--muted)]">
          <p>Unable to load order status.</p>
          <p className="mt-1">
            Confirm the phone number matches the one used at checkout, then try again.
          </p>
          <CustomerButton
            variant="secondary"
            className="mt-4"
            onClick={() => {
              setPhoneReady(false);
            }}
          >
            Change phone
          </CustomerButton>
        </div>
      )}

      {data && (
        <OrderStatusTracker
          status={data.status}
          orderType={data.order_type}
          totalAmount={data.total_amount}
          discountTotal={data.discount_total}
          orderId={data.id}
        />
      )}

      <CustomerRouteLink href="/menu" className="mt-8 block">
        <CustomerButton variant="secondary" className="w-full">
          Order Again
        </CustomerButton>
      </CustomerRouteLink>
    </div>
  );
}
