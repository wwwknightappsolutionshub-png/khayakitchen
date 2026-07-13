"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { bindOrderingTenant, getOrderingTenantSlug } from "@/lib/api-client";
import { useCartStore } from "@/stores/cart-store";

export default function OrderingEntryPage() {
  const params = useParams<{ slug: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const clearCart = useCartStore((s) => s.clearCart);
  const slug = typeof params.slug === "string" ? params.slug : "";

  useEffect(() => {
    if (!slug) return;
    const previous = getOrderingTenantSlug();
    bindOrderingTenant(slug);
    if (previous && previous !== slug) {
      clearCart();
    }
    // Drop any cached storefront/menu from a previous kitchen (e.g. pilot).
    void queryClient.removeQueries({ queryKey: ["storefront"] });
    void queryClient.removeQueries({ queryKey: ["menu"] });
    router.replace("/");
  }, [slug, router, queryClient, clearCart]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="text-center">
        <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <p className="text-sm text-muted">Opening ordering page…</p>
      </div>
    </div>
  );
}
