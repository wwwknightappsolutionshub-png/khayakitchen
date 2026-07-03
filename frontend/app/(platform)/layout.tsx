import type { Metadata } from "next";
import { PlatformSidebar } from "@/components/platform/PlatformSidebar";
import { PlatformAuthGuard } from "@/components/platform/PlatformAuthGuard";

export const metadata: Metadata = {
  title: "KhayaOS Platform",
};

export default function PlatformLayout({ children }: { children: React.ReactNode }) {
  return (
    <PlatformAuthGuard>
      <div className="flex h-screen bg-[#0a0c10] text-foreground">
        <PlatformSidebar />
        <main className="flex-1 overflow-y-auto">
          <div className="p-6 lg:p-8">{children}</div>
        </main>
      </div>
    </PlatformAuthGuard>
  );
}
