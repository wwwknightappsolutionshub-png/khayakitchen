"use client";

import { PlatformSidebar } from "@/components/platform/PlatformSidebar";
import { ResponsiveAppShell } from "@/components/shared/ResponsiveAppShell";

interface PlatformShellProps {
  children: React.ReactNode;
}

export function PlatformShell({ children }: PlatformShellProps) {
  return (
    <ResponsiveAppShell
      className="bg-[#0a0c10] text-foreground"
      headerClassName="border-violet-500/20 bg-[#0a0c10] text-violet-100"
      menuButtonClassName="text-violet-100 hover:bg-violet-500/10"
      mobileSubtitleClassName="text-violet-300/70"
      contentClassName="lg:p-8"
      mobileTitle="KhayaOS Platform"
      mobileSubtitle="Super Admin"
      renderSidebar={(props) => <PlatformSidebar {...props} />}
    >
      {children}
    </ResponsiveAppShell>
  );
}
