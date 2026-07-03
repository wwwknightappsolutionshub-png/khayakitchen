"use client";

import Link from "next/link";
import { Package } from "lucide-react";
import { CustomerButton } from "@/components/customer/CustomerButton";
import { useCartStore } from "@/stores/cart-store";

export default function AccountPage() {
  const activeOrderId = useCartStore((s) => s.activeOrderId);

  return (
    <div className="customer-animate-in px-4 pt-6">
      <header className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Account</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">Track orders and manage preferences</p>
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
