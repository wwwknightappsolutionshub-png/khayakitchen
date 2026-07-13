"use client";

import { useEffect } from "react";
import { PlatformSidebar } from "@/components/platform/PlatformSidebar";
import { ResponsiveAppShell } from "@/components/shared/ResponsiveAppShell";

interface PlatformShellProps {
  children: React.ReactNode;
}

export function PlatformShell({ children }: PlatformShellProps) {
  // Platform UI is dark; root layout defaults to light tokens (dark text on dark tables).
  // Set html data-theme so shared tokens (and portaled modals) resolve for legibility.
  useEffect(() => {
    const html = document.documentElement;
    const previous = html.getAttribute("data-theme");
    html.setAttribute("data-theme", "dark");
    return () => {
      if (previous) {
        html.setAttribute("data-theme", previous);
      } else {
        html.removeAttribute("data-theme");
      }
    };
  }, []);

  return (
    <ResponsiveAppShell
      className="platform-app bg-[#0a0c10] text-foreground"
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
