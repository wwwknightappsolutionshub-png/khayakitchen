"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCartStore } from "@/stores/cart-store";
import { useUiStore } from "@/stores/ui-store";
import { useStorefront } from "@/hooks/useStorefront";
import { formatCurrency } from "@/lib/utils";
import { CustomerButton } from "./CustomerButton";
import { cn } from "@/lib/utils";

export function StickyCartBar() {
  const pathname = usePathname();
  const itemCount = useCartStore((s) => s.getItemCount());
  const total = useCartStore((s) => s.getTotal());
  const cartBounce = useUiStore((s) => s.cartBounce);
  const { data: storefront } = useStorefront();
  const isClosed = storefront?.status?.is_accepting_orders === false;

  const hiddenRoutes = ["/cart", "/checkout"];
  if (itemCount === 0 || hiddenRoutes.includes(pathname)) return null;

  const href = pathname === "/checkout" ? "/checkout" : "/cart";

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-[var(--border)] bg-[var(--surface)]/95 backdrop-blur-md safe-area-pb">
      <div
        className={cn(
          "mx-auto flex max-w-lg items-center justify-between gap-4 px-4 py-3",
          cartBounce && "customer-bounce",
        )}
      >
        <div>
          <p className="text-xs text-[var(--muted)]">
            {itemCount} {itemCount === 1 ? "item" : "items"}
          </p>
          <p className="price text-lg text-[var(--foreground)]">{formatCurrency(total)}</p>
        </div>
        <Link href={isClosed ? "/menu" : href}>
          <CustomerButton size="md" disabled={isClosed}>
            {isClosed ? "Closed" : "View Cart"}
          </CustomerButton>
        </Link>
      </div>
    </div>
  );
}
