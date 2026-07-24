"use client";

import Image from "next/image";
import Link from "next/link";
import {
  CheckCircle2,
  Clock3,
  ShieldCheck,
  Smartphone,
  Store,
  TrendingUp,
  UtensilsCrossed,
  Wallet,
} from "lucide-react";
import { KHAYA_FEATURE_SLIDES } from "@/lib/khayaos-features";
import { MarketingUrgencyCountdown } from "@/components/marketing/MarketingUrgencyCountdown";
import { marketingTheme } from "@/lib/marketing-theme";
import { cn } from "@/lib/utils";

const BENEFITS = [
  {
    title: "Own your customers",
    body: "Your branded PWA and menu — not rented traffic inside someone else’s app.",
    icon: Smartphone,
  },
  {
    title: "Keep more of every order",
    body: "Direct orders avoid marketplace commission. Growth tools push repeat visits back to you.",
    icon: Wallet,
  },
  {
    title: "Run the kitchen in one place",
    body: "Orders, prep board, inventory, loyalty, and campaigns — one operating system.",
    icon: UtensilsCrossed,
  },
  {
    title: "Recover revenue others leave behind",
    body: "End-of-day offers, proximity pushes, and loyalty redeem the customers marketplaces forget.",
    icon: TrendingUp,
  },
] as const;

const COMPARE_ROWS = [
  {
    label: "Customer relationship",
    marketplace: "Rented — platform owns the diner",
    khayaos: "Yours — your app, your data",
  },
  {
    label: "Fees on direct sales",
    marketplace: "High commission on each order",
    khayaos: "Your margin — no marketplace cut",
  },
  {
    label: "Kitchen & ops",
    marketplace: "Order tickets only",
    khayaos: "Full kitchen OS + inventory",
  },
  {
    label: "Growth after the order",
    marketplace: "Limited loyalty inside their app",
    khayaos: "Loyalty, campaigns, revenue recovery",
  },
] as const;

const PROOF = [
  {
    title: "Live kitchen ops",
    body: "Orders move from pending → accepted → preparing → ready with staff accountability.",
    icon: Clock3,
  },
  {
    title: "Tenant isolation",
    body: "Every kitchen workspace is multi-tenant safe — your menu, customers, and data stay yours.",
    icon: ShieldCheck,
  },
  {
    title: "Installable PWA",
    body: "Staff and diners add KhayaOS to the home screen for app-speed ordering and service.",
    icon: Smartphone,
  },
  {
    title: "Direct + marketplace ready",
    body: "Keep Uber Eats as a channel if you want — KhayaOS still runs the kitchen you own.",
    icon: Store,
  },
] as const;

/** Marketing face for /get-started — hero → why → benefits → proof → capabilities → start. */
export function GetStartedMarketingHero({
  signupHref,
}: {
  signupHref: string;
}) {
  return (
    <div className="space-y-20 md:space-y-28">
      <section className="relative left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] -mt-10 w-screen">
        <div className="relative min-h-[78vh] overflow-hidden md:min-h-[85vh]">
          <Image
            src="/get-started-hero.jpg"
            alt="Busy restaurant kitchen pass during service"
            fill
            priority
            quality={70}
            sizes="100vw"
            className="object-cover object-center get-started-hero-pan"
          />
          <div
            className="absolute inset-0 bg-gradient-to-r from-[#0a0806] via-[#0a0806]/88 to-[#0a0806]/45"
            aria-hidden
          />
          <div
            className="absolute inset-0 bg-gradient-to-t from-[#0a0806] via-transparent to-[#0a0806]/50"
            aria-hidden
          />

          <div className="relative mx-auto flex min-h-[78vh] max-w-6xl flex-col justify-end px-6 pb-16 pt-24 md:min-h-[85vh] md:pb-24 md:pt-32">
            <p className="get-started-fade-up text-4xl font-bold tracking-tight text-white sm:text-5xl md:text-6xl lg:text-7xl">
              KhayaOS
            </p>
            <h1 className="get-started-fade-up-delay mt-4 max-w-2xl text-2xl font-semibold tracking-tight text-white md:text-3xl lg:text-4xl">
              The kitchen operating system for food businesses
            </h1>
            <p className="get-started-fade-up-late mt-4 max-w-xl text-base leading-relaxed text-zinc-300 md:text-lg">
              Orders, prep, inventory, loyalty, and revenue recovery — one workspace you own.
            </p>
            <div className="get-started-fade-up-late mt-8">
              <Link
                href={signupHref}
                className={cn(
                  "inline-flex items-center justify-center rounded-full px-6 py-2.5 text-sm font-semibold text-white",
                  marketingTheme.primaryButton,
                )}
              >
                Start free
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section id="why" className="max-w-3xl scroll-mt-28">
        <h2 className="text-2xl font-semibold tracking-tight text-white md:text-3xl">Why KhayaOS</h2>
        <p className="mt-3 text-base leading-relaxed text-zinc-400 md:text-lg">
          Food businesses are stuck stitching delivery apps, spreadsheets, and kitchen screens
          together. KhayaOS replaces that patchwork with one operating system — so you run service
          and growth without renting your customers from a marketplace.
        </p>
      </section>

      <section
        id="benefits"
        className="relative left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] w-screen scroll-mt-24"
      >
        <div className="border-y border-amber-500/20 bg-gradient-to-b from-amber-500/10 via-[#14100c] to-[#0a0806] px-6 py-16 md:py-20">
          <div className="mx-auto max-w-6xl space-y-12">
            <div className="max-w-3xl">
              <p className={cn("text-sm font-semibold uppercase tracking-[0.2em]", marketingTheme.eyebrow)}>
                Own the relationship
              </p>
              <h2 className="mt-3 text-3xl font-bold tracking-tight text-white md:text-4xl">
                Benefits of KhayaOS
              </h2>
              <p className="mt-4 text-base leading-relaxed text-zinc-300 md:text-lg">
                Uber Eats, Just Eat, and Deliveroo are demand channels. KhayaOS is the system that
                runs your kitchen and keeps the customer after the order.
              </p>
            </div>

            <ul className="grid gap-5 sm:grid-cols-2">
              {BENEFITS.map((item) => {
                const Icon = item.icon;
                return (
                  <li
                    key={item.title}
                    className="rounded-2xl border border-amber-500/25 bg-[#0a0806]/70 p-5 shadow-[0_0_40px_rgba(224,122,95,0.08)]"
                  >
                    <span
                      className={cn(
                        "mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl",
                        marketingTheme.iconBox,
                      )}
                    >
                      <Icon className="h-5 w-5" />
                    </span>
                    <h3 className="text-lg font-semibold text-white">{item.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-zinc-400">{item.body}</p>
                  </li>
                );
              })}
            </ul>

            <div className="overflow-hidden rounded-2xl border border-amber-500/30 bg-[#0a0806]/80">
              <div className="grid grid-cols-[minmax(7rem,1.1fr)_1fr_1fr] gap-0 border-b border-amber-500/20 bg-amber-500/10 px-4 py-3 text-xs font-semibold uppercase tracking-wider text-zinc-300 sm:px-5 sm:text-sm">
                <span className="sr-only sm:not-sr-only sm:text-transparent">.</span>
                <span>Marketplaces</span>
                <span className={marketingTheme.eyebrow}>KhayaOS</span>
              </div>
              {COMPARE_ROWS.map((row) => (
                <div
                  key={row.label}
                  className="grid grid-cols-[minmax(7rem,1.1fr)_1fr_1fr] gap-3 border-b border-white/10 px-4 py-4 text-sm last:border-b-0 sm:gap-4 sm:px-5"
                >
                  <div className="font-medium text-zinc-200">{row.label}</div>
                  <div className="text-zinc-500">{row.marketplace}</div>
                  <div className="font-medium text-amber-100">{row.khayaos}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="proof" className="scroll-mt-28 space-y-8">
        <div className="max-w-3xl">
          <h2 className="text-2xl font-semibold tracking-tight text-white md:text-3xl">
            Proof of service
          </h2>
          <p className="mt-3 text-base text-zinc-400 md:text-lg">
            Built as a production kitchen OS — not a landing-page mock. These are capabilities live
            in KhayaOS today.
          </p>
        </div>
        <ul className="grid gap-6 sm:grid-cols-2">
          {PROOF.map((item) => {
            const Icon = item.icon;
            return (
              <li key={item.title} className="flex gap-3">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-amber-400" aria-hidden />
                <div>
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4 text-amber-200/80" aria-hidden />
                    <h3 className="font-semibold text-white">{item.title}</h3>
                  </div>
                  <p className="mt-1 text-sm leading-relaxed text-zinc-400">{item.body}</p>
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      <section id="capabilities" className="scroll-mt-28 space-y-8">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-white md:text-3xl">What you get</h2>
          <p className="mt-2 text-sm text-zinc-400 md:text-base">
            Everything in KhayaOS — from kitchen ops to growth tools.
          </p>
        </div>
        <div className="grid gap-6 sm:grid-cols-2">
          {KHAYA_FEATURE_SLIDES.map((slide) => (
            <article
              key={slide.id}
              className={cn(
                "rounded-2xl border p-5",
                marketingTheme.surfaceBorder,
                marketingTheme.surface,
              )}
            >
              <h3 className="text-lg font-semibold text-white">{slide.title}</h3>
              <p className="mt-1 text-sm text-zinc-400">{slide.subtitle}</p>
              <ul className="mt-4 space-y-2">
                {slide.features.slice(0, 4).map((feature) => {
                  const Icon = feature.icon;
                  return (
                    <li key={feature.key} className="flex gap-2.5 text-sm text-zinc-300">
                      <span
                        className={cn(
                          "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg",
                          marketingTheme.iconBox,
                        )}
                      >
                        <Icon className="h-3.5 w-3.5" />
                      </span>
                      <span>
                        <span className="font-medium text-white">{feature.title}</span>
                        <span className="text-zinc-500"> — {feature.description}</span>
                      </span>
                    </li>
                  );
                })}
              </ul>
            </article>
          ))}
        </div>
      </section>

      <section id="start" className="max-w-2xl scroll-mt-28 pb-4">
        <h2 className="text-2xl font-semibold tracking-tight text-white md:text-3xl">
          Start your kitchen workspace
        </h2>
        <p className="mt-3 text-base text-zinc-400">
          Provision your tenant free — then grow with the tools your plan unlocks. This window
          resets at midnight.
        </p>
        <MarketingUrgencyCountdown />
        <div className="mt-8">
          <Link
            href={signupHref}
            className={cn(
              "inline-flex items-center justify-center rounded-full px-6 py-2.5 text-sm font-semibold text-white",
              marketingTheme.primaryButton,
            )}
          >
            Start free now
          </Link>
        </div>
      </section>
    </div>
  );
}
