"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { setTenantSlug } from "@/lib/api-client";

export default function OrderingEntryPage() {
  const params = useParams<{ slug: string }>();
  const router = useRouter();
  const slug = typeof params.slug === "string" ? params.slug : "";

  useEffect(() => {
    if (!slug) return;
    setTenantSlug(slug);
    router.replace("/");
  }, [slug, router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="text-center">
        <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <p className="text-sm text-muted">Opening ordering page…</p>
      </div>
    </div>
  );
}
