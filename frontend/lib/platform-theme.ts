/** Platform / Super Admin theme — separate from tenant `khayaos_ui_theme` and marketing. */

export type PlatformThemeMode = "dark" | "light";

export const PLATFORM_THEME_STORAGE_KEY = "khayaos_platform_theme";

/** Set on `.platform-app` (and auth screens) for CSS remaps. */
export const PLATFORM_THEME_ATTR = "data-platform-theme";

export type PlatformThemeChrome = {
  pageBg: string;
  headerBg: string;
  menuButton: string;
  mobileSubtitle: string;
  sidebar: string;
  sidebarBorder: string;
  brandTitle: string;
  brandMeta: string;
  closeButton: string;
  navActive: string;
  navIdle: string;
  footerBorder: string;
  userName: string;
  userMeta: string;
  signOut: string;
  pwaInstall: string;
  toggle: string;
};

export const platformThemes: Record<PlatformThemeMode, PlatformThemeChrome> = {
  dark: {
    pageBg: "bg-[#0a0c10] text-foreground",
    headerBg: "border-violet-500/20 bg-[#0a0c10] text-violet-100",
    menuButton: "text-violet-100 hover:bg-violet-500/10",
    mobileSubtitle: "text-violet-300/70",
    sidebar: "border-violet-500/20 bg-[#0a0c10]",
    sidebarBorder: "border-violet-500/20",
    brandTitle: "text-violet-100",
    brandMeta: "text-violet-300/70",
    closeButton: "text-violet-200/70 hover:bg-violet-500/10 hover:text-violet-100",
    navActive: "bg-violet-600/20 text-violet-200",
    navIdle: "text-violet-200/70 hover:bg-violet-500/10 hover:text-violet-100",
    footerBorder: "border-violet-500/20",
    userName: "text-violet-100",
    userMeta: "text-violet-300/70",
    signOut: "text-violet-200/70 hover:bg-violet-500/10 hover:text-violet-100",
    pwaInstall: "text-violet-200/70 hover:bg-violet-500/10 hover:text-violet-100",
    toggle:
      "border-violet-500/30 bg-violet-500/10 text-violet-200 hover:bg-violet-500/20",
  },
  light: {
    pageBg: "bg-[#f7f8fb] text-foreground",
    headerBg: "border-slate-200 bg-white text-slate-900",
    menuButton: "text-slate-800 hover:bg-violet-50",
    mobileSubtitle: "text-slate-600",
    sidebar: "border-slate-200 bg-white",
    sidebarBorder: "border-slate-200",
    brandTitle: "text-slate-900",
    brandMeta: "text-slate-600",
    closeButton: "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
    navActive: "bg-violet-100 text-violet-900",
    navIdle: "text-slate-700 hover:bg-violet-50 hover:text-violet-900",
    footerBorder: "border-slate-200",
    userName: "text-slate-900",
    userMeta: "text-slate-600",
    signOut: "text-slate-700 hover:bg-slate-100 hover:text-slate-900",
    pwaInstall: "text-slate-700 hover:bg-violet-50 hover:text-violet-900",
    toggle: "border-slate-200 bg-white text-violet-700 hover:bg-violet-50",
  },
};

export function parsePlatformThemeMode(
  value: string | null | undefined,
): PlatformThemeMode | null {
  if (value === "light" || value === "dark") return value;
  return null;
}

export function readStoredPlatformTheme(): PlatformThemeMode {
  if (typeof window === "undefined") return "dark";
  try {
    return (
      parsePlatformThemeMode(window.localStorage.getItem(PLATFORM_THEME_STORAGE_KEY)) ?? "dark"
    );
  } catch {
    return "dark";
  }
}

export function writeStoredPlatformTheme(mode: PlatformThemeMode): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(PLATFORM_THEME_STORAGE_KEY, mode);
  } catch {
    /* ignore */
  }
}
