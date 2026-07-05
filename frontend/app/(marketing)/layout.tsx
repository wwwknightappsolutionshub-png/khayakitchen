import Link from "next/link";

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#0a0a0c] font-[family-name:var(--font-anek)] text-white">
        <header className="border-b border-white/10 px-6 py-4">
          <div className="mx-auto flex max-w-6xl items-center justify-between">
            <Link href="/get-started" className="text-lg font-semibold tracking-tight">
              KhayaOS
            </Link>
            <nav className="flex items-center gap-4 text-sm">
              <Link href="/pricing" className="text-zinc-400 hover:text-white">
                Pricing
              </Link>
              <Link href="/login" className="text-violet-400 hover:text-violet-300">
                Sign in
              </Link>
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-6 py-10">{children}</main>
      </div>
  );
}
