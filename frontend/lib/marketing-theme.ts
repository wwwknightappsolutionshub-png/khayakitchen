/** Marketing-only palette (separate from tenant workspace ui_theme). */

export type MarketingThemeMode = "dark" | "light";

export const MARKETING_THEME_STORAGE_KEY = "khayaos_marketing_theme";

export type MarketingThemeTokens = {
  pageBg: string;
  pageText: string;
  headerBg: string;
  surface: string;
  surfaceMuted: string;
  surfaceBorder: string;
  accent: string;
  eyebrow: string;
  link: string;
  navLink: string;
  navChip: string;
  heading: string;
  body: string;
  muted: string;
  subtle: string;
  stepComplete: string;
  stepCurrent: string;
  stepPending: string;
  progressBar: string;
  iconBox: string;
  cardHover: string;
  checkbox: string;
  subtitle: string;
  primaryButton: string;
  secondaryButton: string;
  input: string;
  iconButton: string;
  glowOpacity: string;
  heroOverlayX: string;
  heroOverlayY: string;
  heroBrand: string;
  heroHeadline: string;
  heroBody: string;
  benefitsBand: string;
  benefitCard: string;
  compareTable: string;
  compareRowBorder: string;
  compareLabel: string;
  compareMarketplace: string;
  compareKhayaos: string;
  toastSurface: string;
  chatPanel: string;
};

export const marketingThemes: Record<MarketingThemeMode, MarketingThemeTokens> = {
  dark: {
    pageBg: "bg-[#0a0806]",
    pageText: "text-white",
    headerBg: "border-white/10 bg-[#0a0806]/85",
    surface: "bg-[#14100c]",
    surfaceMuted: "bg-[#0a0806]",
    surfaceBorder: "border-white/10",
    accent: "#E07A5F",
    eyebrow: "text-amber-200/80",
    link: "text-amber-400 hover:text-amber-300",
    navLink: "text-zinc-400 hover:text-white",
    navChip: "border-white/10 text-zinc-300",
    heading: "text-white",
    body: "text-zinc-300",
    muted: "text-zinc-400",
    subtle: "text-zinc-500",
    stepComplete: "border-amber-500 bg-orange-600 text-white",
    stepCurrent: "border-amber-400 bg-amber-500/20 text-amber-100",
    stepPending: "border-white/10 bg-[#14100c] text-zinc-500",
    progressBar: "bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500",
    iconBox: "bg-[#E07A5F]/15 text-amber-200",
    cardHover: "hover:border-amber-500/30",
    checkbox: "accent-orange-500",
    subtitle: "text-amber-100/70",
    primaryButton:
      "border-0 bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 text-white shadow-[0_0_24px_rgba(224,122,95,0.25)] hover:from-amber-400 hover:via-orange-400 hover:to-rose-400 focus-visible:ring-amber-400/50",
    secondaryButton:
      "border-white/10 bg-[#14100c] text-amber-100/90 hover:border-amber-500/30 hover:bg-[#1c1612] focus-visible:ring-amber-400/40",
    input:
      "border-white/10 bg-[#0a0806] text-white placeholder:text-zinc-600 focus:border-amber-500/40",
    iconButton: "text-zinc-400 hover:text-white",
    glowOpacity: "opacity-30",
    heroOverlayX: "bg-gradient-to-r from-[#0a0806] via-[#0a0806]/88 to-[#0a0806]/45",
    heroOverlayY: "bg-gradient-to-t from-[#0a0806] via-transparent to-[#0a0806]/50",
    heroBrand: "text-white",
    heroHeadline: "text-white",
    heroBody: "text-zinc-300",
    benefitsBand:
      "border-amber-500/20 bg-gradient-to-b from-amber-500/10 via-[#14100c] to-[#0a0806]",
    benefitCard:
      "rounded-2xl border border-amber-500/25 bg-[#0a0806]/70 p-5 shadow-[0_0_40px_rgba(224,122,95,0.08)]",
    compareTable: "overflow-hidden rounded-2xl border border-amber-500/30 bg-[#0a0806]/80",
    compareRowBorder: "border-white/10",
    compareLabel: "font-medium text-zinc-200",
    compareMarketplace: "text-zinc-500",
    compareKhayaos: "font-medium text-amber-100",
    toastSurface: "bg-[#14100c]/95",
    chatPanel: "border-white/10 bg-[#14100c]",
  },
  light: {
    pageBg: "bg-[#f6f1ea]",
    pageText: "text-zinc-900",
    headerBg: "border-stone-200/80 bg-[#f6f1ea]/90",
    surface: "bg-white",
    surfaceMuted: "bg-[#efe8df]",
    surfaceBorder: "border-stone-200",
    accent: "#E07A5F",
    eyebrow: "text-amber-800/80",
    link: "text-amber-700 hover:text-amber-600",
    navLink: "text-zinc-600 hover:text-zinc-900",
    navChip: "border-stone-200 text-zinc-700",
    heading: "text-zinc-900",
    body: "text-zinc-700",
    muted: "text-zinc-600",
    subtle: "text-zinc-500",
    stepComplete: "border-amber-500 bg-orange-600 text-white",
    stepCurrent: "border-amber-500 bg-amber-100 text-amber-900",
    stepPending: "border-stone-200 bg-white text-zinc-400",
    progressBar: "bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500",
    iconBox: "bg-[#E07A5F]/15 text-amber-800",
    cardHover: "hover:border-amber-500/40",
    checkbox: "accent-orange-500",
    subtitle: "text-amber-900/70",
    primaryButton:
      "border-0 bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 text-white shadow-[0_0_20px_rgba(224,122,95,0.2)] hover:from-amber-400 hover:via-orange-400 hover:to-rose-400 focus-visible:ring-amber-500/40",
    secondaryButton:
      "border-stone-200 bg-white text-zinc-800 hover:border-amber-400/50 hover:bg-[#efe8df] focus-visible:ring-amber-500/30",
    input:
      "border-stone-200 bg-white text-zinc-900 placeholder:text-zinc-400 focus:border-amber-500/50",
    iconButton: "text-zinc-500 hover:text-zinc-900",
    glowOpacity: "opacity-15",
    // Lighter overlays so the kitchen photo still reads; dark copy on the left for contrast.
    heroOverlayX: "bg-gradient-to-r from-[#f6f1ea] via-[#f6f1ea]/88 to-[#f6f1ea]/25",
    heroOverlayY: "bg-gradient-to-t from-[#f6f1ea] via-transparent to-[#f6f1ea]/35",
    heroBrand: "text-zinc-900",
    heroHeadline: "text-zinc-900",
    heroBody: "text-zinc-700",
    benefitsBand:
      "border-amber-600/20 bg-gradient-to-b from-amber-100/80 via-[#efe8df] to-[#f6f1ea]",
    benefitCard:
      "rounded-2xl border border-amber-500/30 bg-white/90 p-5 shadow-[0_8px_30px_rgba(28,25,23,0.06)]",
    compareTable: "overflow-hidden rounded-2xl border border-amber-500/30 bg-white/95",
    compareRowBorder: "border-stone-200",
    compareLabel: "font-medium text-zinc-800",
    compareMarketplace: "text-zinc-500",
    compareKhayaos: "font-medium text-amber-900",
    toastSurface: "bg-white/95",
    chatPanel: "border-stone-200 bg-white",
  },
};

/** Default dark tokens — prefer `useMarketingTheme()` inside marketing UI. */
export const marketingTheme = marketingThemes.dark;

export function parseMarketingThemeMode(value: string | null | undefined): MarketingThemeMode | null {
  if (value === "light" || value === "dark") return value;
  return null;
}
