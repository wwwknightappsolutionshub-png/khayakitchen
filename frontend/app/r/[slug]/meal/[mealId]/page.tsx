import type { Metadata } from "next";
import { Suspense } from "react";
import { MealShareRedirectClient } from "@/components/customer/MealShareRedirectClient";

const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1").replace(
  /\/$/,
  "",
);
const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ||
  process.env.NEXT_PUBLIC_APP_URL ||
  "https://khayaos.prohost.cloud"
).replace(/\/$/, "");

type PageProps = {
  params: Promise<{ slug: string; mealId: string }>;
};

async function fetchMealShare(slug: string, mealId: string) {
  try {
    const res = await fetch(`${API_URL}/storefront/meal-share/${encodeURIComponent(mealId)}`, {
      headers: {
        Accept: "application/json",
        "X-Tenant-Slug": slug,
      },
      next: { revalidate: 300 },
    });
    if (!res.ok) return null;
    return (await res.json()) as {
      restaurant_name?: string;
      og_title?: string;
      og_description?: string;
      og_image?: string | null;
      meal?: { name?: string; image_url?: string | null };
    };
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug, mealId } = await params;
  const data = await fetchMealShare(slug, mealId);
  const title = data?.og_title || data?.restaurant_name || "Kitchen menu";
  const description =
    data?.og_description ||
    `Try ${data?.meal?.name ?? "this menu"} — I think you will really love it.`;
  const image = data?.og_image || data?.meal?.image_url || undefined;
  const url = `${SITE_URL}/r/${slug}/meal/${mealId}`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url,
      siteName: title,
      type: "website",
      images: image
        ? [
            {
              url: image,
              alt: data?.meal?.name || title,
            },
          ]
        : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: image ? [image] : undefined,
    },
  };
}

export default async function MealSharePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-background px-4">
          <p className="text-sm text-muted">Opening menu…</p>
        </div>
      }
    >
      <MealShareRedirectClient />
    </Suspense>
  );
}
