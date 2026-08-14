import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { getActiveCurrency } from "@/lib/workspace-runtime";
import { currencySymbol } from "@/lib/currencies";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function toNumber(value: string | number | null | undefined): number {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

const CURRENCY_LOCALES: Record<string, string> = {
  GBP: "en-GB",
  USD: "en-US",
  EUR: "en-IE",
  NGN: "en-NG",
  GHS: "en-GH",
  KES: "en-KE",
  ZAR: "en-ZA",
  CAD: "en-CA",
  AUD: "en-AU",
  INR: "en-IN",
  AED: "en-AE",
};

/** Tenant money. Uses workspace currency — never falls back to GBP. */
export function formatCurrency(amount: string | number, currency?: string): string {
  const code = (currency || getActiveCurrency() || "").toUpperCase();
  if (!code) {
    return new Intl.NumberFormat("en", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(toNumber(amount));
  }
  const locale = CURRENCY_LOCALES[code] ?? undefined;
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: code,
    }).format(toNumber(amount));
  } catch {
    const symbol = currencySymbol(code);
    return `${symbol}${new Intl.NumberFormat("en", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(toNumber(amount))}`;
  }
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(date));
}
