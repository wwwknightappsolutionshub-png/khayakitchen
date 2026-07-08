"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

const SPLASH_DURATION_MS = 3_000;

interface KitchenSignupSplashProps {
  onComplete: () => void;
}

export function KitchenSignupSplash({ onComplete }: KitchenSignupSplashProps) {
  const [visible, setVisible] = useState(true);
  const [progress, setProgress] = useState(0);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;
  const dismissedRef = useRef(false);

  const dismiss = () => {
    if (dismissedRef.current) return;
    dismissedRef.current = true;
    setVisible(false);
    window.setTimeout(() => onCompleteRef.current(), 400);
  };

  useEffect(() => {
    const startedAt = Date.now();
    const tick = window.setInterval(() => {
      const elapsed = Date.now() - startedAt;
      setProgress(Math.min(100, (elapsed / SPLASH_DURATION_MS) * 100));
      if (elapsed >= SPLASH_DURATION_MS) {
        window.clearInterval(tick);
        dismiss();
      }
    }, 50);

    return () => window.clearInterval(tick);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      onClick={dismiss}
      role="button"
      tabIndex={0}
      className={cn(
        "fixed inset-0 z-[1000] flex cursor-pointer items-center justify-center overflow-hidden bg-[#0a0806] transition-opacity duration-500",
        visible ? "opacity-100" : "pointer-events-none opacity-0",
      )}
      aria-live="polite"
      aria-label="KhayaOS kitchen welcome — tap to continue"
    >
      <div className="signup-splash-glow absolute inset-0" />
      <div className="signup-splash-ember absolute left-[12%] top-[18%] h-40 w-40 rounded-full bg-amber-500/20 blur-3xl" />
      <div className="signup-splash-ember-delay absolute bottom-[16%] right-[10%] h-52 w-52 rounded-full bg-orange-600/15 blur-3xl" />

      <div className="signup-splash-steam signup-splash-steam-1" />
      <div className="signup-splash-steam signup-splash-steam-2" />
      <div className="signup-splash-steam signup-splash-steam-3" />

      <div className="relative z-10 flex flex-col items-center px-6 text-center">
        <div className="signup-splash-logo-ring relative mb-8 flex h-36 w-36 items-center justify-center rounded-[2rem] border border-amber-500/25 bg-[#14100c]/80 shadow-[0_0_80px_rgba(224,122,95,0.25)] backdrop-blur-sm">
          <div className="signup-splash-logo-pulse absolute inset-0 rounded-[2rem]" />
          <Image
            src="/icon.svg"
            alt="KhayaOS"
            width={96}
            height={96}
            priority
            className="relative z-10 h-24 w-24 signup-splash-logo-float"
          />
        </div>

        <h1 className="signup-splash-fade-up text-4xl font-bold tracking-tight text-white md:text-5xl">
          KhayaOS
        </h1>
        <p className="signup-splash-fade-up-delay mt-4 max-w-md text-base leading-relaxed text-amber-100/75 md:text-lg">
          The kitchen operating system for orders, prep, inventory, and revenue — all in one place.
        </p>

        <div className="signup-splash-fade-up-delay mt-10 w-48">
          <div className="h-1 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 transition-[width] duration-100 ease-linear"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <p className="signup-splash-fade-up-delay mt-6 text-xs text-amber-100/50">Tap anywhere to continue</p>
      </div>
    </div>
  );
}
