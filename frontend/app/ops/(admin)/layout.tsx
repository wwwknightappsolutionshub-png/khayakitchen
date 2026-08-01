import type { Metadata } from "next";
import { AdminAuthGuard } from "@/components/admin/AdminAuthGuard";
import { AdminShell } from "@/components/admin/AdminShell";
import { AdminWorkspaceSync } from "@/components/admin/AdminWorkspaceSync";
import { OpsPwaManifestLink } from "@/components/admin/OpsPwaManifestLink";
import { RealtimeProvider } from "@/providers/RealtimeProvider";

export const metadata: Metadata = {
  title: "Admin",
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

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminAuthGuard>
      <OpsPwaManifestLink />
      <RealtimeProvider channels={["admin", "kitchen"]}>
        <AdminWorkspaceSync>
          <AdminShell>{children}</AdminShell>
        </AdminWorkspaceSync>
      </RealtimeProvider>
    </AdminAuthGuard>
  );
}
