import type { Metadata } from "next";
import { TenantPwaManifestLink } from "@/components/customer/TenantPwaManifestLink";

export const metadata: Metadata = {
  title: "Order",
  description: "Order from your kitchen",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Order",
  },
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
};

/** Ordering deep-link entry: advertise customer Order PWA, never Ops. */
export default function OrderingEntryLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <TenantPwaManifestLink />
      {children}
    </>
  );
}
