"use client";

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
  MessageSquare,
  Users,
  UserPlus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { AdminPwaInstallNav } from "@/components/admin/AdminPwaInstallNav";
import type { MobileNavProps } from "@/components/shared/ResponsiveAppShell";
import { OPS_ROUTES } from "@/lib/ops-paths";
import { PlatformThemeToggle } from "@/components/platform/PlatformThemeToggle";
import { usePlatformTheme } from "@/providers/PlatformThemeProvider";

const allNavItems = [
  { href: OPS_ROUTES.platformDashboard, label: "Dashboard", icon: LayoutDashboard, superOnly: true },
  { href: OPS_ROUTES.platformInbox, label: "Inbox", icon: MessageSquare, superOnly: false },
  { href: OPS_ROUTES.platformLeads, label: "Leads", icon: UserPlus, superOnly: true },
  { href: OPS_ROUTES.platformStaff, label: "Platform Staff", icon: Users, superOnly: true },
  { href: OPS_ROUTES.platformTenants, label: "Tenants", icon: Building2, superOnly: true },
  { href: OPS_ROUTES.platformModules, label: "Modules", icon: Boxes, superOnly: true },
  { href: OPS_ROUTES.platformFeatureFlags, label: "Feature Flags", icon: Flag, superOnly: true },
  { href: OPS_ROUTES.platformRevenueRecovery, label: "Revenue Recovery", icon: Radar, superOnly: true },
  { href: OPS_ROUTES.platformPricing, label: "Plans & Pricing", icon: CreditCard, superOnly: true },
  { href: OPS_ROUTES.platformFeatures, label: "Feature Library", icon: Layers, superOnly: true },
  { href: OPS_ROUTES.platformFeatureAssignments, label: "Feature Assignments", icon: Grid3X3, superOnly: true },
  { href: OPS_ROUTES.platformBilling, label: "Billing", icon: Receipt, superOnly: true },
  { href: OPS_ROUTES.platformAudit, label: "Audit", icon: ClipboardList, superOnly: true },
  { href: OPS_ROUTES.platformSettings, label: "Settings", icon: Settings, superOnly: true },
];

export function PlatformSidebar({ mobileOpen = false, onMobileClose }: MobileNavProps) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { chrome } = usePlatformTheme();
  const isOwner = user?.role === "super_admin";
  const navItems = allNavItems.filter((item) => isOwner || !item.superOnly);

  return (
    <aside
      className={cn(
        "flex h-full w-64 max-w-[85vw] flex-col border-r",
        chrome.sidebar,
        "fixed inset-y-0 left-0 z-50 transition-transform duration-200 ease-in-out",
        "lg:static lg:z-auto lg:h-full lg:w-64 lg:max-w-none lg:translate-x-0",
        mobileOpen
          ? "translate-x-0 pointer-events-auto"
          : "-translate-x-full pointer-events-none lg:pointer-events-auto lg:translate-x-0",
      )}
    >
      <div className={cn("flex h-16 items-center gap-2 border-b px-5", chrome.sidebarBorder)}>
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet-600 text-sm font-bold text-white">
          <Shield className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className={cn("truncate text-sm font-semibold", chrome.brandTitle)}>KhayaOS Platform</p>
          <p className={cn("text-xs capitalize", chrome.brandMeta)}>
            {user?.role?.replaceAll("_", " ")}
          </p>
        </div>
        <PlatformThemeToggle className="hidden lg:inline-flex" />
        {onMobileClose ? (
          <button
            type="button"
            aria-label="Close navigation menu"
            onClick={onMobileClose}
            className={cn(
              "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius)] transition-colors lg:hidden",
              chrome.closeButton,
            )}
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

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onMobileClose}
              className={cn(
                "flex items-center gap-3 rounded-[var(--radius)] px-3 py-2.5 text-sm font-medium transition-colors",
                isActive ? chrome.navActive : chrome.navIdle,
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className={cn("border-t p-3", chrome.footerBorder)}>
        <AdminPwaInstallNav onNavigate={onMobileClose} className={cn("mb-1", chrome.pwaInstall)} />
        <div className="mb-2 px-3">
          <p className={cn("truncate text-sm font-medium", chrome.userName)}>
            {user?.name ?? "Platform user"}
          </p>
          <p className={cn("truncate text-xs capitalize", chrome.userMeta)}>
            platform · {user?.role?.replaceAll("_", " ")}
          </p>
        </div>
        <button
          onClick={() => logout()}
          className={cn(
            "flex w-full items-center gap-3 rounded-[var(--radius)] px-3 py-2 text-sm transition-colors",
            chrome.signOut,
          )}
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </div>
    </aside>
  );
}
