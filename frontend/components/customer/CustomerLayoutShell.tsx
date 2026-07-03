"use client";

import { useCartStore } from "@/stores/cart-store";
import { usePathname } from "next/navigation";

export function CustomerLayoutShell({ children }: { children: React.ReactNode }) {
  const itemCount = useCartStore((s) => s.getItemCount());
  const pathname = usePathname();
  const hasCartBar = itemCount > 0 && !["/cart", "/checkout"].includes(pathname);

  return (
    <main className={`mx-auto min-h-[calc(100vh-3.5rem)] max-w-lg ${hasCartBar ? "pb-24" : "pb-8"}`}>
      {children}
    </main>
  );
}
