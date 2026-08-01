import type { Metadata } from "next";
import { AuthThemeForce } from "@/components/shared/AuthThemeForce";
import { OpsPwaManifestLink } from "@/components/admin/OpsPwaManifestLink";

export const metadata: Metadata = {
  title: "Sign In",
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

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <OpsPwaManifestLink />
      <AuthThemeForce />
      {children}
    </div>
  );
}
