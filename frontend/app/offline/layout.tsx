import type { Metadata } from "next";
import { TenantPwaManifestLink } from "@/components/customer/TenantPwaManifestLink";

export const metadata: Metadata = {
  title: "Offline",
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

export default function OfflineLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <TenantPwaManifestLink />
      {children}
    </>
  );
}
