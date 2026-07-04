"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { cn } from "@/lib/utils";

interface MobileNavProps {
  mobileOpen: boolean;
  onMobileClose: () => void;
}

interface ResponsiveAppShellProps {
  children: React.ReactNode;
  mobileTitle: string;
  mobileSubtitle: string;
  renderSidebar: (props: MobileNavProps) => React.ReactNode;
  className?: string;
  headerClassName?: string;
  menuButtonClassName?: string;
  contentClassName?: string;
  mobileSubtitleClassName?: string;
}

export function ResponsiveAppShell({
  children,
  mobileTitle,
  mobileSubtitle,
  renderSidebar,
  className,
  headerClassName,
  menuButtonClassName,
  contentClassName,
  mobileSubtitleClassName,
}: ResponsiveAppShellProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  const closeMobile = () => setMobileOpen(false);

  return (
    <div className={cn("flex h-screen bg-background", className)}>
      {mobileOpen ? (
        <button
          type="button"
          aria-label="Close navigation menu"
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={closeMobile}
        />
      ) : null}

      {renderSidebar({ mobileOpen, onMobileClose: closeMobile })}

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header
          className={cn(
            "flex h-14 shrink-0 items-center gap-3 border-b border-border bg-surface px-4 lg:hidden",
            headerClassName,
          )}
        >
          <button
            type="button"
            aria-label="Open navigation menu"
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen(true)}
            className={cn(
              "inline-flex h-10 w-10 items-center justify-center rounded-[var(--radius)] text-foreground transition-colors hover:bg-surface-elevated",
              menuButtonClassName,
            )}
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{mobileTitle}</p>
            <p className={cn("truncate text-xs text-muted", mobileSubtitleClassName)}>
              {mobileSubtitle}
            </p>
          </div>
        </header>

        <main className="min-w-0 flex-1 overflow-y-auto overflow-x-hidden">
          <div className={cn("p-4 sm:p-6 lg:p-8", contentClassName)}>{children}</div>
        </main>
      </div>
    </div>
  );
}

export type { MobileNavProps };
