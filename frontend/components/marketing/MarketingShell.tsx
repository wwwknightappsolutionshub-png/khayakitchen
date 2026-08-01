"use client";

import Link from "next/link";
import { MarketingThemeToggle } from "@/components/marketing/MarketingThemeToggle";
import {
  MarketingThemeProvider,
  useMarketingTheme,
} from "@/providers/MarketingThemeProvider";
import { cn } from "@/lib/utils";

const SECTION_LINKS = [
  { href: "/ops/get-started#why", label: "Why" },
  { href: "/ops/get-started#benefits", label: "Benefits" },
  { href: "/ops/get-started#proof", label: "Proof" },
  { href: "/ops/get-started#capabilities", label: "Capabilities" },
  { href: "/ops/get-started#start", label: "Start" },
] as const;

function MarketingShellInner({ children }: { children: React.ReactNode }) {
  const { mode, theme, ready } = useMarketingTheme();

  return (
    <div
      className={cn(
        "marketing-app relative min-h-screen font-[family-name:var(--font-anek)]",
        // Page bg/text come from CSS + html[data-khayaos-mkt] (boot script) to avoid FOUC.
        // Token classes apply after ready so SSR dark utilities don't paint over light.
        ready && theme.pageText,
      )}
      data-marketing-theme={mode}
      data-theme-ready={ready ? "1" : "0"}
      suppressHydrationWarning
    >
      <div
        className={cn(
          "signup-splash-glow pointer-events-none absolute inset-0",
          theme.glowOpacity,
        )}
      />
      <header
        className={cn(
          "marketing-header sticky top-0 z-30 border-b px-6 py-4 backdrop-blur-md",
          ready ? theme.headerBg : "border-transparent bg-transparent",
        )}
      >
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
          <Link
            href="/ops/get-started"
            className="flex shrink-0 items-center gap-2.5 text-lg font-semibold tracking-tight"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/icon-ops-192.png"
              alt=""
              width={32}
              height={32}
              className="h-8 w-8 rounded-lg object-cover"
            />
            KhayaOS
          </Link>
          <nav className="hidden items-center gap-4 text-sm md:flex">
            {SECTION_LINKS.map((link) => (
              <a key={link.href} href={link.href} className={theme.navLink}>
                {link.label}
              </a>
            ))}
          </nav>
          <div className="flex items-center gap-2 sm:gap-3 text-sm">
            <MarketingThemeToggle />
            <Link href="/ops/login" className={theme.link}>
              Sign in
            </Link>
            <Link
              href="/ops/get-started?signup=1"
              className={cn(
                "rounded-full px-4 py-1.5 text-sm font-semibold text-white",
                theme.primaryButton,
              )}
            >
              Sign up
            </Link>
          </div>
        </div>
        <nav className="mx-auto mt-3 flex max-w-6xl gap-3 overflow-x-auto pb-1 text-xs md:hidden">
          {SECTION_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className={cn(
                "shrink-0 rounded-full border px-3 py-1",
                theme.navChip,
              )}
            >
              {link.label}
            </a>
          ))}
        </nav>
      </header>
      <main
        className={cn(
          "relative mx-auto max-w-6xl px-6 pt-10 pb-[max(2.5rem,calc(env(safe-area-inset-bottom)+2rem))]",
          !ready && "invisible",
        )}
      >
        {children}
      </main>
      <footer
        className={cn(
          "relative border-t px-6 py-10",
          theme.surfaceBorder,
          !ready && "invisible",
        )}
      >
        <div className="mx-auto flex max-w-6xl flex-col gap-8 md:flex-row md:items-start md:justify-between">
          <div className="flex items-start gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/icon-ops-192.png"
              alt=""
              width={36}
              height={36}
              className="mt-0.5 h-9 w-9 rounded-lg object-cover"
            />
            <div>
              <p className={cn("text-lg font-semibold", theme.heading)}>KhayaOS</p>
              <p className={cn("mt-2 max-w-sm text-sm", theme.subtle)}>
                The kitchen operating system for food businesses.
              </p>
            </div>
          </div>
          <nav className={cn("flex flex-wrap gap-x-5 gap-y-2 text-sm", theme.muted)}>
            {SECTION_LINKS.map((link) => (
              <a key={link.href} href={link.href} className={theme.navLink}>
                {link.label}
              </a>
            ))}
            <Link href="/ops/login" className={theme.navLink}>
              Sign in
            </Link>
            <Link href="/ops/get-started?signup=1" className={theme.navLink}>
              Sign up
            </Link>
            <a
              href="https://wa.me/447756183484"
              className={theme.navLink}
              rel="noreferrer"
            >
              WhatsApp
            </a>
          </nav>
        </div>
      </footer>
    </div>
  );
}

/** Client chrome for `(marketing)` routes — theme toggle + light/dark shell. */
export function MarketingShell({ children }: { children: React.ReactNode }) {
  return (
    <MarketingThemeProvider>
      <MarketingShellInner>{children}</MarketingShellInner>
    </MarketingThemeProvider>
  );
}
