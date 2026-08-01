import type { Metadata } from "next";
import { OpsPwaManifestLink } from "@/components/admin/OpsPwaManifestLink";

export const metadata: Metadata = {
  title: "Pricing",
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
    ],
    apple: [{ url: "/apple-touch-icon-ops.png", sizes: "180x180", type: "image/png" }],
  },
};

export default function PublicPricingLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <OpsPwaManifestLink />
      {children}
    </>
  );
}
