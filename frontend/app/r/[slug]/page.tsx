"use client";

import { useEffect } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { bindOrderingTenant, getOrderingTenantSlug } from "@/lib/api-client";
import { useCartStore } from "@/stores/cart-store";

const REF_KEY = "khayaos-referral-token";

export default function OrderingEntryPage() {
  const params = useParams<{ slug: string }>();
  const searchParams = useSearchParams();
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

    const ref = searchParams.get("ref");
    if (ref) {
      localStorage.setItem(REF_KEY, ref);
    }

    const meal = searchParams.get("meal");
    const review = searchParams.get("review");
    void queryClient.removeQueries({ queryKey: ["storefront"] });
    void queryClient.removeQueries({ queryKey: ["menu"] });

    const qs = new URLSearchParams();
    if (meal) qs.set("meal", meal);
    if (ref) qs.set("ref", ref);
    if (review === "1") qs.set("review", "1");
    const query = qs.toString();

    // PWA / kitchen link entry: always land on the menu (not home/login splash).
    router.replace(query ? `/menu?${query}` : "/menu");
  }, [slug, router, queryClient, clearCart, searchParams]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="text-center">
        <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <p className="text-sm text-muted">Opening ordering page…</p>
      </div>
    </div>
  );
}
