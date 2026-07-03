"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ModalPortal } from "@/components/ui/ModalPortal";
import { type Promotion, getUnseenPromo, markPromoSeen } from "@/lib/promotions";
import { cn } from "@/lib/utils";

const accentStyles = {
  primary: "bg-primary text-white",
  secondary: "bg-secondary text-white",
  highlight: "bg-highlight text-background",
};

export function PromoModal() {
  const [promo, setPromo] = useState<Promotion | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      const next = getUnseenPromo();
      if (next) {
        setPromo(next);
        setOpen(true);
      }
    }, 1200);
    return () => clearTimeout(timer);
  }, []);

  const dismiss = () => {
    if (promo) markPromoSeen(promo.id);
    setOpen(false);
  };

  if (!promo) return null;

  return (
    <ModalPortal open={open} onClose={dismiss}>
      <div className="fixed inset-0 z-[200] flex items-end justify-center p-4 sm:items-center">
        <button
          type="button"
          className="absolute inset-0 bg-black/55 backdrop-blur-[2px]"
          onClick={dismiss}
          aria-label="Close"
        />

        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="promo-title"
          className="relative z-10 w-full max-w-md overflow-hidden rounded-2xl bg-surface shadow-2xl animate-fade-in"
        >
          <div className="relative h-44 w-full">
            <Image
              src={promo.image}
              alt=""
              fill
              className="object-cover"
              sizes="(max-width: 448px) 100vw, 448px"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
            <button
              type="button"
              onClick={dismiss}
              className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm"
              aria-label="Close promotion"
            >
              <X className="h-4 w-4" />
            </button>
            <span
              className={cn(
                "absolute bottom-3 left-3 rounded-full px-3 py-1 text-xs font-semibold",
                accentStyles[promo.accent],
              )}
            >
              {promo.badge}
            </span>
          </div>

          <div className="p-5">
            <p className="text-xs font-medium uppercase tracking-wide text-muted">{promo.title}</p>
            <h2 id="promo-title" className="mt-1 text-xl font-bold">
              {promo.headline}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-muted">{promo.description}</p>

            <div className="mt-5 flex gap-2">
              <Link href={promo.href} className="flex-1" onClick={dismiss}>
                <Button className="w-full">{promo.cta}</Button>
              </Link>
              <Button variant="ghost" onClick={dismiss}>
                Later
              </Button>
            </div>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}
