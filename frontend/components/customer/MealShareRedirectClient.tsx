"use client";

import { useEffect } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { bindOrderingTenant, getOrderingTenantSlug } from "@/lib/api-client";
import { useCartStore } from "@/stores/cart-store";

/**
 * Client binder for /r/{slug}/meal/{mealId} — server page owns OG metadata.
 */
export function MealShareRedirectClient() {
  const params = useParams<{ slug: string; mealId: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const clearCart = useCartStore((s) => s.clearCart);
  const slug = typeof params.slug === "string" ? params.slug : "";
  const mealId = typeof params.mealId === "string" ? params.mealId : "";

  useEffect(() => {
    if (!slug || !mealId) return;
    const previous = getOrderingTenantSlug();
    bindOrderingTenant(slug);
    if (previous && previous !== slug) {
      clearCart();
    }

    const ref = searchParams.get("ref");
    if (ref) {
      localStorage.setItem("khayaos-referral-token", ref);
    }

    void queryClient.removeQueries({ queryKey: ["storefront"] });
    void queryClient.removeQueries({ queryKey: ["menu"] });

    const qs = new URLSearchParams();
    qs.set("meal", mealId);
    if (ref) qs.set("ref", ref);
    router.replace(`/menu?${qs.toString()}`);
  }, [slug, mealId, router, queryClient, clearCart, searchParams]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="text-center">
        <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <p className="text-sm text-muted">Opening menu…</p>
      </div>
    </div>
  );
}
