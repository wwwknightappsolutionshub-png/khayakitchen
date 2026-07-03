"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { OrderStatusTracker } from "@/components/customer/OrderStatusTracker";
import { CustomerButton } from "@/components/customer/CustomerButton";
import { useOrderTracking } from "@/hooks/useOrderTracking";
import { useCartStore } from "@/stores/cart-store";

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
  const storedOrderId = useCartStore((s) => s.activeOrderId);
  const orderId = searchParams.get("id") ?? storedOrderId;

  const { data, isLoading, error } = useOrderTracking(orderId);

  if (!orderId) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center customer-animate-in">
        <h1 className="text-xl font-semibold">No active order</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">Place an order to track it here</p>
        <Link href="/menu" className="mt-6">
          <CustomerButton>Order Now</CustomerButton>
        </Link>
      </div>
    );
  }

  return (
    <div className="customer-animate-in px-4 pt-6">
      <header className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Order Tracking</h1>
      </header>

      {isLoading && <TrackingSkeleton />}

      {error && !data && (
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-6 py-10 text-center text-sm text-[var(--muted)]">
          <p>Unable to load order status.</p>
          <p className="mt-1">Your order may still be processing.</p>
        </div>
      )}

      {data && (
        <OrderStatusTracker
          status={data.status}
          orderType={data.order_type}
          totalAmount={data.total_amount}
          orderId={data.id}
        />
      )}

      <Link href="/menu" className="mt-8 block">
        <CustomerButton variant="secondary" className="w-full">
          Order Again
        </CustomerButton>
      </Link>
    </div>
  );
}
