import { NextResponse } from "next/server";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(
  _request: Request,
  context: { params: Promise<{ slug: string }> },
) {
  const { slug } = await context.params;
  if (!slug || !/^[a-z0-9-]+$/i.test(slug)) {
    return NextResponse.json({ message: "Invalid tenant slug" }, { status: 400 });
  }

  try {
    const response = await fetch(
      `${API_URL}/storefront/pwa-manifest/${encodeURIComponent(slug)}`,
      {
        cache: "no-store",
        headers: { Accept: "application/manifest+json, application/json" },
      },
    );

    if (!response.ok) {
      return NextResponse.json(
        { message: "Manifest not found" },
        { status: response.status },
      );
    }

    const manifest = await response.json();

    return new NextResponse(JSON.stringify(manifest), {
      status: 200,
      headers: {
        "Content-Type": "application/manifest+json",
        "Cache-Control": "public, max-age=0, must-revalidate",
      },
    });
  } catch {
    return NextResponse.json({ message: "Failed to load manifest" }, { status: 502 });
  }
}
