"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Building2,
  Boxes,
  Flag,
  CreditCard,
  LogOut,
  Shield,
  ClipboardList,
  Settings,
  Layers,
  Grid3X3,
  Receipt,
  X,
  Radar,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { ComingSoonModal } from "./ComingSoonModal";
import type { MobileNavProps } from "@/components/shared/ResponsiveAppShell";

const navItems = [
  { href: "/platform/dashboard", label: "Dashboard", icon: LayoutDashboard, available: true },
  { href: "/platform/tenants", label: "Tenants", icon: Building2, available: true },
  { href: "/platform/modules", label: "Modules", icon: Boxes, available: true },
  { href: "/platform/feature-flags", label: "Feature Flags", icon: Flag, available: true },
  { href: "/platform/revenue-recovery", label: "Revenue Recovery", icon: Radar, available: true },
  { href: "/platform/pricing", label: "Plans & Pricing", icon: CreditCard, available: true },
  { href: "/platform/features", label: "Feature Library", icon: Layers, available: true },
  { href: "/platform/feature-assignments", label: "Feature Assignments", icon: Grid3X3, available: true },
  { href: "/platform/billing", label: "Billing", icon: Receipt, available: true },
  { href: "/platform/audit", label: "Audit", icon: ClipboardList, available: true },
  { href: "/platform/settings", label: "Settings", icon: Settings, available: true },
];

export function PlatformSidebar({ mobileOpen = false, onMobileClose }: MobileNavProps) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [comingSoonLabel, setComingSoonLabel] = useState<string | null>(null);

  return (
    <>
      <aside
        className={cn(
          "flex h-full w-64 max-w-[85vw] flex-col border-r border-violet-500/20 bg-[#0a0c10]",
          "fixed inset-y-0 left-0 z-50 transition-transform duration-200 ease-in-out",
          "lg:static lg:z-auto lg:h-full lg:w-64 lg:max-w-none lg:translate-x-0",
          mobileOpen
            ? "translate-x-0 pointer-events-auto"
            : "-translate-x-full pointer-events-none lg:pointer-events-auto lg:translate-x-0",
        )}
      >
        <div className="flex h-16 items-center gap-2 border-b border-violet-500/20 px-5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet-600 text-sm font-bold text-white">
            <Shield className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-violet-100">KhayaOS Platform</p>
            <p className="text-xs text-violet-300/70">Super Admin</p>
          </div>
          {onMobileClose ? (
            <button
              type="button"
              aria-label="Close navigation menu"
              onClick={onMobileClose}
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius)] text-violet-200/70 transition-colors hover:bg-violet-500/10 hover:text-violet-100 lg:hidden"
            >
              <X className="h-5 w-5" />
            </button>
          ) : null}
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              pathname === item.href || pathname.startsWith(`${item.href}/`);

            if (!item.available) {
              return (
                <button
                  key={item.href}
                  type="button"
                  onClick={() => {
                    onMobileClose?.();
                    setComingSoonLabel(item.label);
                  }}
                  className="flex w-full cursor-not-allowed items-center gap-3 rounded-[var(--radius)] px-3 py-2.5 text-sm font-medium text-muted/50"
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {item.label}
                  <span className="ml-auto text-[10px] uppercase tracking-wide">Soon</span>
                </button>
              );
            }

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onMobileClose}
                className={cn(
                  "flex items-center gap-3 rounded-[var(--radius)] px-3 py-2.5 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-violet-600/20 text-violet-200"
                    : "text-violet-200/70 hover:bg-violet-500/10 hover:text-violet-100",
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-violet-500/20 p-3">
          <div className="mb-2 px-3">
            <p className="truncate text-sm font-medium text-violet-100">
              {user?.name ?? "Super Admin"}
            </p>
            <p className="truncate text-xs text-violet-300/70">platform · super_admin</p>
          </div>
          <button
            onClick={() => logout()}
            className="flex w-full items-center gap-3 rounded-[var(--radius)] px-3 py-2 text-sm text-violet-200/70 transition-colors hover:bg-violet-500/10 hover:text-violet-100"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </div>
      </aside>

      <ComingSoonModal
        open={comingSoonLabel !== null}
        moduleName={comingSoonLabel ?? "Feature"}
        onClose={() => setComingSoonLabel(null)}
      />
    </>
  );
}
