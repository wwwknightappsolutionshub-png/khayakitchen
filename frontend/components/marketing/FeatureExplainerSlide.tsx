"use client";

import type { KhayaFeatureSlide } from "@/lib/khayaos-features";
import { marketingTheme } from "@/lib/marketing-theme";
import { cn } from "@/lib/utils";

interface FeatureExplainerSlideProps {
  slide: KhayaFeatureSlide;
}

export function FeatureExplainerSlide({ slide }: FeatureExplainerSlideProps) {
  return (
    <div className="space-y-6">
      <div>
        <p className={cn("text-sm font-semibold uppercase tracking-[0.18em]", marketingTheme.eyebrow)}>
          KhayaOS
        </p>
        <h2 className="mt-2 text-3xl font-bold tracking-tight text-white md:text-4xl">{slide.title}</h2>
        <p className="mt-3 max-w-3xl text-base leading-relaxed text-zinc-400">{slide.subtitle}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {slide.features.map((feature) => {
          const Icon = feature.icon;
          return (
            <article
              key={feature.key}
              className={cn(
                "rounded-2xl border p-5 transition-colors",
                marketingTheme.surfaceBorder,
                marketingTheme.surface,
                marketingTheme.cardHover,
              )}
            >
              <div
                className={cn(
                  "mb-3 flex h-11 w-11 items-center justify-center rounded-xl",
                  marketingTheme.iconBox,
                )}
              >
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-semibold text-white">{feature.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-zinc-400">{feature.description}</p>
            </article>
          );
        })}
      </div>
    </div>
  );
}
