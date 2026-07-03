import Link from "next/link";
import { CustomerButton } from "@/components/customer/CustomerButton";

export default function OfflinePage() {
  return (
    <div className="customer-app flex min-h-screen flex-col items-center justify-center bg-[var(--background)] px-4 text-center">
      <p className="text-4xl">📡</p>
      <h1 className="mt-4 text-xl font-semibold text-[var(--foreground)]">You&apos;re offline</h1>
      <p className="mt-2 max-w-xs text-sm text-[var(--muted)]">
        Check your connection. Your cart is saved locally.
      </p>
      <Link href="/menu" className="mt-8">
        <CustomerButton>Try Again</CustomerButton>
      </Link>
    </div>
  );
}
