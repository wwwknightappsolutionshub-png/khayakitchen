import type { Metadata, Viewport } from "next";
import { CustomerHeader } from "@/components/customer/CustomerHeader";
import { CustomerStatusLayer } from "@/components/customer/CustomerStatusLayer";
import { StickyCartBar } from "@/components/customer/StickyCartBar";
import { PwaRegister } from "@/components/customer/PwaRegister";
import { NotificationOptInPrompt } from "@/components/customer/NotificationOptInPrompt";
import { CustomerLayoutShell } from "@/components/customer/CustomerLayoutShell";
import { StorefrontTheme } from "@/components/customer/StorefrontTheme";
import { RealtimeProvider } from "@/providers/RealtimeProvider";

export const metadata: Metadata = {
  title: "Order",
  description: "Order from Khaya Kitchen",
};

export const viewport: Viewport = {
  themeColor: "#0F0F10",
};

export default function CustomerLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="customer-app min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <StorefrontTheme>
        <RealtimeProvider channels={["customer"]} enabled>
        <PwaRegister />
        <NotificationOptInPrompt />
        <CustomerHeader />
        <CustomerStatusLayer />
        <CustomerLayoutShell>{children}</CustomerLayoutShell>
        <StickyCartBar />
        </RealtimeProvider>
      </StorefrontTheme>
    </div>
  );
}
