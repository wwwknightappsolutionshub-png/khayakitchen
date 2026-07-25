"use client";

import type { KhayaFeatureSlide } from "@/lib/khayaos-features";
import { useMarketingTheme } from "@/providers/MarketingThemeProvider";
import { cn } from "@/lib/utils";

interface FeatureExplainerSlideProps {
  slide: KhayaFeatureSlide;
}

export function FeatureExplainerSlide({ slide }: FeatureExplainerSlideProps) {
  const { theme } = useMarketingTheme();

  return (
    <div className="space-y-6">
      <div>
        <p className={cn("text-sm font-semibold uppercase tracking-[0.18em]", theme.eyebrow)}>
          KhayaOS
        </p>
        <h2 className={cn("mt-2 text-3xl font-bold tracking-tight md:text-4xl", theme.heading)}>
          {slide.title}
        </h2>
        <p className={cn("mt-3 max-w-3xl text-base leading-relaxed", theme.muted)}>
          {slide.subtitle}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {slide.features.map((feature) => {
          const Icon = feature.icon;
          return (
            <article
              key={feature.key}
              className={cn(
                "rounded-2xl border p-5 transition-colors",
                theme.surfaceBorder,
                theme.surface,
                theme.cardHover,
              )}
            >
              <div
                className={cn(
                  "mb-3 flex h-11 w-11 items-center justify-center rounded-xl",
                  theme.iconBox,
                )}
              >
                <Icon className="h-5 w-5" />
              </div>
              <h3 className={cn("text-lg font-semibold", theme.heading)}>{feature.title}</h3>
              <p className={cn("mt-2 text-sm leading-relaxed", theme.muted)}>{feature.description}</p>
            </article>
          );
        })}
      </div>
    </div>
  );
}
