"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ShoppingBag,
  ChefHat,
  Package,
  Users,
  Gift,
  BarChart3,
  Settings,
  LogOut,
  Megaphone,
  Store,
  UtensilsCrossed,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useFeatureFlags } from "@/hooks/useFeatureFlags";
import type { MobileNavProps } from "@/components/shared/ResponsiveAppShell";

const navItems = [
  { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard, flag: "dashboard" },
  { href: "/orders", label: "Orders", icon: ShoppingBag, flag: "orders" },
  { href: "/kitchen", label: "Kitchen", icon: ChefHat, flag: "kitchen" },
  { href: "/admin/menu", label: "Menu", icon: UtensilsCrossed, flag: "menu" },
  { href: "/inventory", label: "Inventory", icon: Package, flag: "inventory" },
  { href: "/crm", label: "CRM", icon: Users, flag: "crm" },
  { href: "/loyalty", label: "Loyalty", icon: Gift, flag: "loyalty" },
  { href: "/marketing", label: "Marketing", icon: Megaphone, flag: "notifications.campaigns" },
  { href: "/branding", label: "Branding", icon: Store, flag: null },
  { href: "/reports", label: "Reports", icon: BarChart3, flag: "reporting" },
  { href: "/settings", label: "Settings", icon: Settings, flag: null },
];

interface SidebarProps extends MobileNavProps {}

export function Sidebar({ mobileOpen = false, onMobileClose }: SidebarProps) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { isEnabled } = useFeatureFlags();

  const visibleItems = navItems.filter((item) => !item.flag || isEnabled(item.flag));

  return (
    <aside
      className={cn(
        "flex h-full w-60 max-w-[85vw] flex-col border-r border-border bg-surface",
        "fixed inset-y-0 left-0 z-50 transition-transform duration-200 ease-in-out lg:static lg:z-auto lg:max-w-none lg:translate-x-0",
        mobileOpen
          ? "translate-x-0"
          : "-translate-x-full pointer-events-none lg:pointer-events-auto lg:translate-x-0",
      )}
    >
      <div className="flex h-16 items-center gap-2 border-b border-border px-5">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-sm font-bold text-white">
          K
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">KhayaOS</p>
          <p className="text-xs text-muted">Business OS</p>
        </div>
        {onMobileClose ? (
          <button
            type="button"
            aria-label="Close navigation menu"
            onClick={onMobileClose}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius)] text-muted transition-colors hover:bg-surface-elevated hover:text-foreground lg:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        ) : null}
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {visibleItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onMobileClose}
              className={cn(
                "flex items-center gap-3 rounded-[var(--radius)] px-3 py-2.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary/15 text-primary"
                  : "text-muted hover:bg-surface-elevated hover:text-foreground",
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-border p-3">
        <div className="mb-2 px-3">
          <p className="truncate text-sm font-medium">{user?.name ?? "Admin"}</p>
          <p className="truncate text-xs capitalize text-muted">{user?.role ?? "owner"}</p>
        </div>
        <button
          onClick={() => logout()}
          className="flex w-full items-center gap-3 rounded-[var(--radius)] px-3 py-2 text-sm text-muted transition-colors hover:bg-surface-elevated hover:text-foreground"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </div>
    </aside>
  );
}
