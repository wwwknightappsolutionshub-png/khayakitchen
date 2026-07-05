/** Shared onboarding / marketing palette — matches KitchenSignupSplash. */
export const marketingTheme = {
  pageBg: "bg-[#0a0806]",
  surface: "bg-[#14100c]",
  surfaceBorder: "border-white/10",
  accent: "#E07A5F",
  eyebrow: "text-amber-200/80",
  link: "text-amber-400 hover:text-amber-300",
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
} as const;
