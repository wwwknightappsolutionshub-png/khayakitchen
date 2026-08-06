import type { Metadata } from "next";
import { PlatformAuthGuard } from "@/components/platform/PlatformAuthGuard";
import { PlatformShell } from "@/components/platform/PlatformShell";
import { OpsPwaManifestLink } from "@/components/admin/OpsPwaManifestLink";
import { PlatformThemeProvider } from "@/providers/PlatformThemeProvider";

export const metadata: Metadata = {
  title: "KhayaOS Platform",
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

export default function PlatformLayout({ children }: { children: React.ReactNode }) {
  return (
    <PlatformThemeProvider>
      <PlatformAuthGuard>
        <OpsPwaManifestLink />
        <PlatformShell>{children}</PlatformShell>
      </PlatformAuthGuard>
    </PlatformThemeProvider>
  );
}
