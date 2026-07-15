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
    void queryClient.removeQueries({ queryKey: ["storefront"] });
    void queryClient.removeQueries({ queryKey: ["menu"] });

    if (meal) {
      router.replace(`/menu?meal=${encodeURIComponent(meal)}${ref ? `&ref=${encodeURIComponent(ref)}` : ""}`);
    } else {
      router.replace(ref ? `/?ref=${encodeURIComponent(ref)}` : "/");
    }
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
