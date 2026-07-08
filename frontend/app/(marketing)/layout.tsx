import Link from "next/link";
import { marketingTheme } from "@/lib/marketing-theme";
import { cn } from "@/lib/utils";

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={cn("marketing-app relative min-h-screen font-[family-name:var(--font-anek)] text-white", marketingTheme.pageBg)}>
      <div className="signup-splash-glow pointer-events-none absolute inset-0 opacity-40" />
      <div className="signup-splash-ember pointer-events-none absolute left-[8%] top-[12%] h-32 w-32 rounded-full bg-amber-500/10 blur-3xl" />
      <div className="signup-splash-ember-delay pointer-events-none absolute bottom-[10%] right-[6%] h-40 w-40 rounded-full bg-orange-600/10 blur-3xl" />
      <header className="relative border-b border-white/10 px-6 py-4">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <Link href="/get-started" className="text-lg font-semibold tracking-tight">
            KhayaOS
          </Link>
          <nav className="flex items-center gap-4 text-sm">
            <Link href="/pricing" className="text-zinc-400 hover:text-white">
              Pricing
            </Link>
            <Link href="/login" className={marketingTheme.link}>
              Sign in
            </Link>
          </nav>
        </div>
      </header>
      <main className="relative mx-auto max-w-6xl px-6 pt-10 pb-[max(2.5rem,calc(env(safe-area-inset-bottom)+2rem))]">
        {children}
      </main>
    </div>
  );
}
