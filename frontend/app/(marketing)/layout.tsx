import type { Metadata } from "next";
import Link from "next/link";
import { marketingTheme } from "@/lib/marketing-theme";
import { cn } from "@/lib/utils";

const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ||
  process.env.NEXT_PUBLIC_APP_URL ||
  "https://khayaos.prohost.cloud"
).replace(/\/$/, "");

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
};

const SECTION_LINKS = [
  { href: "/get-started#why", label: "Why" },
  { href: "/get-started#benefits", label: "Benefits" },
  { href: "/get-started#proof", label: "Proof" },
  { href: "/get-started#capabilities", label: "Capabilities" },
  { href: "/get-started#start", label: "Start" },
] as const;

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className={cn(
        "marketing-app relative min-h-screen font-[family-name:var(--font-anek)] text-white",
        marketingTheme.pageBg,
      )}
    >
      <div className="signup-splash-glow pointer-events-none absolute inset-0 opacity-30" />
      <header className="sticky top-0 z-30 border-b border-white/10 bg-[#0a0806]/85 px-6 py-4 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
          <Link href="/get-started" className="shrink-0 text-lg font-semibold tracking-tight">
            KhayaOS
          </Link>
          <nav className="hidden items-center gap-4 text-sm md:flex">
            {SECTION_LINKS.map((link) => (
              <a key={link.href} href={link.href} className="text-zinc-400 hover:text-white">
                {link.label}
              </a>
            ))}
          </nav>
          <div className="flex items-center gap-3 text-sm">
            <Link href="/login" className={marketingTheme.link}>
              Sign in
            </Link>
            <Link
              href="/get-started?signup=1"
              className={cn(
                "rounded-full px-4 py-1.5 text-sm font-semibold text-white",
                marketingTheme.primaryButton,
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
              className="shrink-0 rounded-full border border-white/10 px-3 py-1 text-zinc-300"
            >
              {link.label}
            </a>
          ))}
        </nav>
      </header>
      <main className="relative mx-auto max-w-6xl px-6 pt-10 pb-[max(2.5rem,calc(env(safe-area-inset-bottom)+2rem))]">
        {children}
      </main>
      <footer className="relative border-t border-white/10 px-6 py-10">
        <div className="mx-auto flex max-w-6xl flex-col gap-8 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-lg font-semibold">KhayaOS</p>
            <p className="mt-2 max-w-sm text-sm text-zinc-500">
              The kitchen operating system for food businesses.
            </p>
          </div>
          <nav className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-zinc-400">
            {SECTION_LINKS.map((link) => (
              <a key={link.href} href={link.href} className="hover:text-white">
                {link.label}
              </a>
            ))}
            <Link href="/login" className="hover:text-white">
              Sign in
            </Link>
            <Link href="/get-started?signup=1" className="hover:text-white">
              Sign up
            </Link>
            <a href="https://wa.me/447756183484" className="hover:text-white" rel="noreferrer">
              WhatsApp
            </a>
          </nav>
        </div>
      </footer>
    </div>
  );
}
