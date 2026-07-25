import type { Metadata } from "next";
import Script from "next/script";
import { MarketingShell } from "@/components/marketing/MarketingShell";
import { MARKETING_THEME_BOOT_SCRIPT } from "@/lib/marketing-theme";

const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ||
  process.env.NEXT_PUBLIC_APP_URL ||
  "https://khayaos.prohost.cloud"
).replace(/\/$/, "");

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
};

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Script id="khayaos-marketing-theme-boot" strategy="beforeInteractive">
        {MARKETING_THEME_BOOT_SCRIPT}
      </Script>
      <MarketingShell>{children}</MarketingShell>
    </>
  );
}
