"use client";

import type { KhayaFeatureSlide } from "@/lib/khayaos-features";

interface FeatureExplainerSlideProps {
  slide: KhayaFeatureSlide;
}

export function FeatureExplainerSlide({ slide }: FeatureExplainerSlideProps) {
  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-violet-300">KhayaOS</p>
        <h2 className="mt-2 text-3xl font-bold tracking-tight text-white md:text-4xl">{slide.title}</h2>
        <p className="mt-3 max-w-3xl text-base leading-relaxed text-zinc-400">{slide.subtitle}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {slide.features.map((feature) => {
          const Icon = feature.icon;
          return (
            <article
              key={feature.key}
              className="rounded-2xl border border-white/10 bg-[#141418] p-5 transition-colors hover:border-violet-500/30"
            >
              <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-violet-600/15 text-violet-300">
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
