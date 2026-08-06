"use client";

import { PlatformSidebar } from "@/components/platform/PlatformSidebar";
import { PlatformThemeToggle } from "@/components/platform/PlatformThemeToggle";
import { ResponsiveAppShell } from "@/components/shared/ResponsiveAppShell";
import { cn } from "@/lib/utils";
import { usePlatformTheme } from "@/providers/PlatformThemeProvider";

interface PlatformShellProps {
  children: React.ReactNode;
}

export function PlatformShell({ children }: PlatformShellProps) {
  const { mode, chrome } = usePlatformTheme();

  return (
    <ResponsiveAppShell
      className={cn("platform-app", chrome.pageBg)}
      data-platform-theme={mode}
      headerClassName={chrome.headerBg}
      menuButtonClassName={chrome.menuButton}
      mobileSubtitleClassName={chrome.mobileSubtitle}
      contentClassName="lg:p-8"
      mobileTitle="KhayaOS Platform"
      mobileSubtitle="Super Admin"
      headerTrailing={<PlatformThemeToggle />}
      renderSidebar={(props) => <PlatformSidebar {...props} />}
    >
      {children}
    </ResponsiveAppShell>
  );
}
