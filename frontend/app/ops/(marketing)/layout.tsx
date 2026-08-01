import type { Metadata } from "next";
import Script from "next/script";
import { MarketingShell } from "@/components/marketing/MarketingShell";
import { OpsPwaManifestLink } from "@/components/admin/OpsPwaManifestLink";
import { MARKETING_THEME_BOOT_SCRIPT } from "@/lib/marketing-theme";

const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ||
  process.env.NEXT_PUBLIC_APP_URL ||
  "https://khayaos.prohost.cloud"
).replace(/\/$/, "");

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  manifest: "/manifest-ops.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "KhayaOS Ops",
  },
  icons: {
    icon: [
      { url: "/icon-ops.svg", type: "image/svg+xml" },
      { url: "/icon-ops-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-ops-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon-ops.png", sizes: "180x180", type: "image/png" }],
  },
};

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Script id="khayaos-marketing-theme-boot" strategy="beforeInteractive">
        {MARKETING_THEME_BOOT_SCRIPT}
      </Script>
      <OpsPwaManifestLink />
      <MarketingShell>{children}</MarketingShell>
    </>
  );
}
