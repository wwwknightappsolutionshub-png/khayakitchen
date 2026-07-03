"use client";

import Image from "next/image";
import Link from "next/link";
import { Gift, Users, CalendarClock } from "lucide-react";
import { PROMOTIONS } from "@/lib/promotions";
import { cn } from "@/lib/utils";

const icons = {
  loyalty: Gift,
  referral: Users,
  "special-booking": CalendarClock,
};

const accentBorder = {
  primary: "border-primary/40",
  secondary: "border-secondary/40",
  highlight: "border-highlight/50",
};

export function PromoBanner() {
  return (
    <section className="mb-6" aria-label="Promotions">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">Offers</h2>
      <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-1 scrollbar-none">
        {PROMOTIONS.map((promo) => {
          const Icon = icons[promo.id];
          return (
            <Link
              key={promo.id}
              href={promo.href}
              className={cn(
                "relative min-w-[260px] shrink-0 overflow-hidden rounded-2xl border bg-surface shadow-sm transition-transform active:scale-[0.98]",
                accentBorder[promo.accent],
              )}
            >
              <div className="relative h-28">
                <Image
                  src={promo.image}
                  alt=""
                  fill
                  className="object-cover"
                  sizes="260px"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/45 to-transparent" />
                <div className="absolute inset-0 flex flex-col justify-end p-4">
                  <div className="mb-1 flex items-center gap-1.5 text-xs font-medium text-white/90">
                    <Icon className="h-3.5 w-3.5" />
                    {promo.badge}
                  </div>
                  <p className="text-sm font-bold leading-tight text-white">{promo.headline}</p>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
