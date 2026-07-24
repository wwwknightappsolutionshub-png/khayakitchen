"use client";

import Image from "next/image";
import Link from "next/link";
import { KHAYA_FEATURE_SLIDES } from "@/lib/khayaos-features";
import { marketingTheme } from "@/lib/marketing-theme";
import { cn } from "@/lib/utils";

const BENEFITS = [
  {
    title: "Own your customers",
    body: "Your branded PWA and menu — not rented traffic inside someone else’s app.",
  },
  {
    title: "Keep more of every order",
    body: "Direct orders avoid marketplace commission. Growth tools push repeat visits back to you.",
  },
  {
    title: "Run the kitchen in one place",
    body: "Orders, prep board, inventory, loyalty, and campaigns — one operating system.",
  },
  {
    title: "Recover revenue others leave behind",
    body: "End-of-day offers, proximity pushes, and loyalty redeem the customers marketplaces forget.",
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

/** Marketing face for /get-started — hero → why → benefits → capabilities. */
export function GetStartedMarketingHero({
  signupHref,
}: {
  signupHref: string;
}) {
  return (
    <div className="space-y-20 md:space-y-28">
      {/* Full-bleed hero: brand + one headline + support + CTAs + dominant image */}
      <section className="relative left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] -mt-10 w-screen">
        <div className="relative min-h-[78vh] overflow-hidden md:min-h-[85vh]">
          <Image
            src="/get-started-hero.jpg"
            alt="Busy restaurant kitchen pass during service"
            fill
            priority
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
            <p
              className={cn(
                "get-started-fade-up text-4xl font-bold tracking-tight text-white sm:text-5xl md:text-6xl lg:text-7xl",
              )}
            >
              KhayaOS
            </p>
            <h1 className="get-started-fade-up-delay mt-4 max-w-2xl text-2xl font-semibold tracking-tight text-white md:text-3xl lg:text-4xl">
              The kitchen operating system for food businesses
            </h1>
            <p className="get-started-fade-up-late mt-4 max-w-xl text-base leading-relaxed text-zinc-300 md:text-lg">
              Orders, prep, inventory, loyalty, and revenue recovery — one workspace you own.
            </p>
            <div className="get-started-fade-up-late mt-8 flex flex-wrap items-center gap-3">
              <Link
                href={signupHref}
                className={cn(
                  "inline-flex items-center justify-center rounded-full px-6 py-2.5 text-sm font-semibold text-white",
                  marketingTheme.primaryButton,
                )}
              >
                Start free
              </Link>
              <Link
                href="/pricing"
                className={cn(
                  "inline-flex items-center justify-center rounded-full border px-6 py-2.5 text-sm font-semibold",
                  marketingTheme.secondaryButton,
                )}
              >
                View pricing
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Why KhayaOS */}
      <section className="max-w-3xl">
        <h2 className="text-2xl font-semibold tracking-tight text-white md:text-3xl">Why KhayaOS</h2>
        <p className="mt-3 text-base leading-relaxed text-zinc-400 md:text-lg">
          Food businesses are stuck stitching delivery apps, spreadsheets, and kitchen screens
          together. KhayaOS replaces that patchwork with one operating system — so you run service
          and growth without renting your customers from a marketplace.
        </p>
      </section>

      {/* Benefits vs marketplaces */}
      <section className="space-y-10">
        <div className="max-w-3xl">
          <h2 className="text-2xl font-semibold tracking-tight text-white md:text-3xl">
            Benefits of KhayaOS
          </h2>
          <p className="mt-3 text-base leading-relaxed text-zinc-400 md:text-lg">
            Uber Eats, Just Eat, and Deliveroo are demand channels. KhayaOS is the system that
            runs your kitchen and keeps the customer after the order.
          </p>
        </div>

        <ul className="grid gap-8 sm:grid-cols-2">
          {BENEFITS.map((item) => (
            <li key={item.title} className="max-w-md">
              <h3 className="text-lg font-semibold text-white">{item.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-zinc-400">{item.body}</p>
            </li>
          ))}
        </ul>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[36rem] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-white/15 text-zinc-400">
                <th className="py-3 pr-4 font-medium"> </th>
                <th className="py-3 pr-4 font-medium">Marketplaces</th>
                <th className={cn("py-3 font-medium", marketingTheme.eyebrow)}>KhayaOS</th>
              </tr>
            </thead>
            <tbody>
              {COMPARE_ROWS.map((row) => (
                <tr key={row.label} className="border-b border-white/10">
                  <th className="py-3 pr-4 align-top font-medium text-zinc-300">{row.label}</th>
                  <td className="py-3 pr-4 align-top text-zinc-500">{row.marketplace}</td>
                  <td className="py-3 align-top text-amber-100/90">{row.khayaos}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* What you get — existing feature catalog */}
      <section className="space-y-8">
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

      {/* Closing CTA */}
      <section className="max-w-2xl pb-4">
        <h2 className="text-2xl font-semibold tracking-tight text-white md:text-3xl">
          Start your kitchen workspace
        </h2>
        <p className="mt-3 text-base text-zinc-400">
          Provision your tenant free — then grow with the tools your plan unlocks.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href={signupHref}
            className={cn(
              "inline-flex items-center justify-center rounded-full px-6 py-2.5 text-sm font-semibold text-white",
              marketingTheme.primaryButton,
            )}
          >
            Start free
          </Link>
          <Link
            href="/pricing"
            className={cn(
              "inline-flex items-center justify-center rounded-full border px-6 py-2.5 text-sm font-semibold",
              marketingTheme.secondaryButton,
            )}
          >
            View pricing
          </Link>
        </div>
      </section>
    </div>
  );
}
