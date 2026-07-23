"use client";

import Link from "next/link";
import { KHAYA_FEATURE_SLIDES } from "@/lib/khayaos-features";
import { marketingTheme } from "@/lib/marketing-theme";
import { cn } from "@/lib/utils";

/** Compact capabilities grid — reuses signup feature catalog (no parallel copy). */
export function GetStartedMarketingHero({
  signupHref,
}: {
  signupHref: string;
}) {
  return (
    <div className="space-y-14">
      <section className="max-w-3xl">
        <p className={cn("text-sm font-semibold uppercase tracking-[0.2em]", marketingTheme.eyebrow)}>
          KhayaOS
        </p>
        <h1 className="mt-3 text-4xl font-bold tracking-tight text-white md:text-5xl lg:text-6xl">
          The kitchen operating system
        </h1>
        <p className="mt-4 max-w-xl text-base leading-relaxed text-zinc-400 md:text-lg">
          Orders, prep, inventory, loyalty, and revenue recovery — one workspace for growing food
          businesses.
        </p>
        <div className="mt-8 flex flex-wrap items-center gap-3">
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

      <section className="space-y-8">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-white">What you get</h2>
          <p className="mt-2 text-sm text-zinc-400">
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
    </div>
  );
}
