/**
 * Canonical Ops (kitchen/staff/platform) URL helpers for Phase B `/ops/*` prefix.
 * Customer storefront stays at root (`/`, `/r/{slug}`, `/menu`, …).
 */

export const OPS_BASE = "/ops";

/** Ensure a path is under `/ops`. Pass "" or "/" for the Ops root. */
export function opsPath(path = "/"): string {
  if (!path || path === "/") return OPS_BASE;
  const normalized = path.startsWith("/") ? path : `/${path}`;
  if (normalized === OPS_BASE || normalized.startsWith(`${OPS_BASE}/`)) {
    return normalized;
  }
  return `${OPS_BASE}${normalized}`;
}

export const OPS_ROUTES = {
  root: OPS_BASE,
  login: opsPath("/login"),
  forgotPassword: opsPath("/forgot-password"),
  resetPassword: opsPath("/reset-password"),
  verifyEmail: opsPath("/verify-email"),
  verifyEmailPending: opsPath("/verify-email-pending"),
  resetApp: opsPath("/reset-app"),
  admin: opsPath("/admin"),
  adminDashboard: opsPath("/admin/dashboard"),
  adminMenu: opsPath("/admin/menu"),
  dashboard: opsPath("/dashboard"),
  orders: opsPath("/orders"),
  accounts: opsPath("/accounts"),
  kitchen: opsPath("/kitchen"),
  inventory: opsPath("/inventory"),
  crm: opsPath("/crm"),
  loyalty: opsPath("/loyalty"),
  inbox: opsPath("/inbox"),
  reviews: opsPath("/reviews"),
  seasonalPromo: opsPath("/seasonal-promo"),
  marketing: opsPath("/marketing"),
  revenueRecovery: opsPath("/revenue-recovery"),
  branding: opsPath("/branding"),
  reports: opsPath("/reports"),
  staffPerformance: opsPath("/staff-performance"),
  settings: opsPath("/settings"),
  audit: opsPath("/audit"),
  platform: opsPath("/platform"),
  platformDashboard: opsPath("/platform/dashboard"),
  platformInbox: opsPath("/platform/inbox"),
  platformLeads: opsPath("/platform/leads"),
  platformStaff: opsPath("/platform/staff"),
  platformTenants: opsPath("/platform/tenants"),
  platformModules: opsPath("/platform/modules"),
  platformFeatureFlags: opsPath("/platform/feature-flags"),
  platformRevenueRecovery: opsPath("/platform/revenue-recovery"),
  platformPricing: opsPath("/platform/pricing"),
  platformFeatures: opsPath("/platform/features"),
  platformFeatureAssignments: opsPath("/platform/feature-assignments"),
  platformBilling: opsPath("/platform/billing"),
  platformAudit: opsPath("/platform/audit"),
  platformSettings: opsPath("/platform/settings"),
  getStarted: opsPath("/get-started"),
  pricing: opsPath("/pricing"),
} as const;

export function isOpsPath(pathname: string): boolean {
  return pathname === OPS_BASE || pathname.startsWith(`${OPS_BASE}/`);
}

/**
 * Legacy (pre–Phase B) Ops paths — permanent redirects map these → `/ops/*`.
 * Do not include customer routes or public assets.
 */
export const LEGACY_OPS_REDIRECT_SOURCES: Array<{ source: string; destination: string; permanent: boolean }> = [
  { source: "/ops", destination: OPS_ROUTES.login, permanent: true },
  { source: "/login", destination: OPS_ROUTES.login, permanent: true },
  { source: "/forgot-password", destination: OPS_ROUTES.forgotPassword, permanent: true },
  { source: "/reset-password", destination: OPS_ROUTES.resetPassword, permanent: true },
  { source: "/verify-email", destination: OPS_ROUTES.verifyEmail, permanent: true },
  { source: "/verify-email-pending", destination: OPS_ROUTES.verifyEmailPending, permanent: true },
  { source: "/reset-app", destination: OPS_ROUTES.resetApp, permanent: true },
  { source: "/admin", destination: OPS_ROUTES.admin, permanent: true },
  { source: "/admin/:path*", destination: `${OPS_BASE}/admin/:path*`, permanent: true },
  { source: "/dashboard", destination: OPS_ROUTES.dashboard, permanent: true },
  { source: "/orders", destination: OPS_ROUTES.orders, permanent: true },
  { source: "/accounts", destination: OPS_ROUTES.accounts, permanent: true },
  { source: "/kitchen", destination: OPS_ROUTES.kitchen, permanent: true },
  { source: "/inventory", destination: OPS_ROUTES.inventory, permanent: true },
  { source: "/crm", destination: OPS_ROUTES.crm, permanent: true },
  { source: "/loyalty", destination: OPS_ROUTES.loyalty, permanent: true },
  { source: "/inbox", destination: OPS_ROUTES.inbox, permanent: true },
  { source: "/reviews", destination: OPS_ROUTES.reviews, permanent: true },
  { source: "/seasonal-promo", destination: OPS_ROUTES.seasonalPromo, permanent: true },
  { source: "/marketing", destination: OPS_ROUTES.marketing, permanent: true },
  { source: "/revenue-recovery", destination: OPS_ROUTES.revenueRecovery, permanent: true },
  { source: "/branding", destination: OPS_ROUTES.branding, permanent: true },
  { source: "/reports", destination: OPS_ROUTES.reports, permanent: true },
  { source: "/staff-performance", destination: OPS_ROUTES.staffPerformance, permanent: true },
  { source: "/settings", destination: OPS_ROUTES.settings, permanent: true },
  { source: "/audit", destination: OPS_ROUTES.audit, permanent: true },
  { source: "/platform", destination: OPS_ROUTES.platform, permanent: true },
  { source: "/platform/:path*", destination: `${OPS_BASE}/platform/:path*`, permanent: true },
  { source: "/get-started", destination: OPS_ROUTES.getStarted, permanent: true },
  { source: "/get-started/:path*", destination: `${OPS_BASE}/get-started/:path*`, permanent: true },
  { source: "/pricing", destination: OPS_ROUTES.pricing, permanent: true },
];
