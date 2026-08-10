import type { Metadata, Viewport } from "next";
import { CustomerHeader } from "@/components/customer/CustomerHeader";
import { CustomerNav } from "@/components/customer/CustomerNav";
import { CustomerStatusLayer } from "@/components/customer/CustomerStatusLayer";
import { CustomerChatPanel } from "@/components/customer/CustomerChatPanel";
import { StickyCartBar } from "@/components/customer/StickyCartBar";
import { NotificationOptInPrompt } from "@/components/customer/NotificationOptInPrompt";
import { ProximityLayer } from "@/components/customer/ProximityLayer";
import { CustomerLayoutShell } from "@/components/customer/CustomerLayoutShell";
import { ConnectionBanner } from "@/components/customer/ConnectionBanner";
import { StorefrontTheme } from "@/components/customer/StorefrontTheme";
import { WelcomeSplashGate } from "@/components/customer/WelcomeSplashGate";
import { TenantPwaManifestLink } from "@/components/customer/TenantPwaManifestLink";
import { PwaInstallPrompt } from "@/components/customer/PwaInstallPrompt";
import { RealtimeProvider } from "@/providers/RealtimeProvider";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Order",
  description: "Order from your kitchen",
  // Tenant Order app manifest is injected by TenantPwaManifestLink (never Ops /manifest.json).
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Order",
  },
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#F7F6F3",
};

export default function CustomerLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="customer-app min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <StorefrontTheme>
        <RealtimeProvider channels={["customer"]} enabled>
        <TenantPwaManifestLink />
        <WelcomeSplashGate />
        <ConnectionBanner />
        <PwaInstallPrompt />
        <NotificationOptInPrompt />
        <ProximityLayer />
        <CustomerHeader />
        <CustomerStatusLayer />
        <CustomerLayoutShell>{children}</CustomerLayoutShell>
        <CustomerChatPanel />
        <StickyCartBar />
        <CustomerNav />
        </RealtimeProvider>
      </StorefrontTheme>
    </div>
  );
}
