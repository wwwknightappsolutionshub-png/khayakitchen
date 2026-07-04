import type { Metadata } from "next";
import { PlatformAuthGuard } from "@/components/platform/PlatformAuthGuard";
import { PlatformShell } from "@/components/platform/PlatformShell";

export const metadata: Metadata = {
  title: "KhayaOS Platform",
};

export default function PlatformLayout({ children }: { children: React.ReactNode }) {
  return (
    <PlatformAuthGuard>
      <PlatformShell>{children}</PlatformShell>
    </PlatformAuthGuard>
  );
}
