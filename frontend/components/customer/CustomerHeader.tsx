"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useStorefront } from "@/hooks/useStorefront";

export function CustomerHeader() {
  const pathname = usePathname();
  const isHome = pathname === "/" || pathname === "/home";
  const isMenu = pathname.startsWith("/menu");
  const { data } = useStorefront();
  const name = data?.branding?.restaurant_name ?? "Khaya Kitchen";
  const logo = data?.branding?.logo_url;

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--border)] bg-[var(--background)]/90 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-lg items-center justify-between px-4">
        <Link href="/home" className="flex items-center gap-2">
          {logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logo} alt="" className="h-8 w-8 rounded-lg object-cover" />
          ) : null}
          <div className="flex flex-col">
            <span className="text-[10px] font-medium uppercase tracking-[0.14em] text-[var(--muted)]">
              {name}
            </span>
            <span className="text-base font-semibold leading-tight tracking-tight">Order</span>
          </div>
        </Link>
        <nav className="flex items-center gap-1">
          <Link
            href="/home"
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              isHome ? "text-[var(--primary)]" : "text-[var(--muted)] hover:text-[var(--foreground)]"
            }`}
          >
            Home
          </Link>
          <Link
            href="/menu"
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              isMenu ? "text-[var(--primary)]" : "text-[var(--muted)] hover:text-[var(--foreground)]"
            }`}
          >
            Menu
          </Link>
          <Link
            href="/account"
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              pathname.startsWith("/account")
                ? "text-[var(--primary)]"
                : "text-[var(--muted)] hover:text-[var(--foreground)]"
            }`}
          >
            Account
          </Link>
        </nav>
      </div>
    </header>
  );
}
