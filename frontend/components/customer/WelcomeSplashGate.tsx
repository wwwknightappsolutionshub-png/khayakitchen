"use client";

import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { platformSettingsService } from "@/services/platform-settings.service";
import { useStorefront } from "@/hooks/useStorefront";
import { CustomerButton } from "@/components/customer/CustomerButton";
import { dispatchSplashComplete } from "@/lib/splash-events";
import type { SeasonalPromoSplash } from "@/lib/types";

const WELCOME_STORAGE_KEY = "khayaos-welcome-seen";
const PROMO_SEEN_PREFIX = "khayaos-seasonal-promo-seen:";

function hasSeenWelcome(): boolean {
  if (typeof window === "undefined") return true;
  return localStorage.getItem(WELCOME_STORAGE_KEY) === "1";
}

function markWelcomeSeen(): void {
  localStorage.setItem(WELCOME_STORAGE_KEY, "1");
}

function hasSeenPromo(id: string): boolean {
  if (typeof window === "undefined") return true;
  return localStorage.getItem(`${PROMO_SEEN_PREFIX}${id}`) === "1";
}

function markPromoSeen(id: string): void {
  localStorage.setItem(`${PROMO_SEEN_PREFIX}${id}`, "1");
}

type SplashMode = "seasonal" | "welcome" | "loading" | "hidden";

export function WelcomeSplashGate() {
  const router = useRouter();
  const pathname = usePathname();
  const isRootEntry = pathname === "/";
  const firstVisit = !hasSeenWelcome();

  const [mode, setMode] = useState<SplashMode>(() => {
    if (!isRootEntry) return "hidden";
    return "loading";
  });
  const [seasonal, setSeasonal] = useState<SeasonalPromoSplash | null>(null);

  const { data: config, isLoading: configLoading } = useQuery({
    queryKey: ["platform", "public-config"],
    queryFn: () => platformSettingsService.getPublicConfig(),
    staleTime: 60_000,
    enabled: isRootEntry,
  });

  const storefront = useStorefront();

  const finishSplash = useCallback(() => {
    dispatchSplashComplete();
    setMode("hidden");
  }, []);

  useEffect(() => {
    if (!isRootEntry) {
      dispatchSplashComplete();
      setMode("hidden");
      return;
    }
    if (configLoading || storefront.isLoading) return;

    const promo = storefront.data?.seasonal_promo ?? null;
    if (promo?.id && !hasSeenPromo(promo.id)) {
      setSeasonal(promo);
      setMode("seasonal");
      return;
    }

    if (config && !config.splash_enabled) {
      finishSplash();
      return;
    }

    if (firstVisit) {
      setMode("welcome");
      return;
    }

    finishSplash();
  }, [
    isRootEntry,
    configLoading,
    storefront.isLoading,
    storefront.data?.seasonal_promo,
    config,
    firstVisit,
    finishSplash,
  ]);

  useEffect(() => {
    if (mode !== "loading") return;
    if (configLoading || storefront.isLoading || !config) return;

    const timer = window.setTimeout(() => {
      finishSplash();
    }, 1200);

    return () => window.clearTimeout(timer);
  }, [mode, configLoading, storefront.isLoading, config, finishSplash]);

  const handleGuest = () => {
    markWelcomeSeen();
    finishSplash();
    router.push("/menu");
  };

  const handleSignup = () => {
    markWelcomeSeen();
    finishSplash();
    router.push("/account?signup=1");
  };

  const handleSeasonalSkip = () => {
    if (seasonal?.id) markPromoSeen(seasonal.id);
    markWelcomeSeen();
    finishSplash();
  };

  const handleSeasonalCta = () => {
    if (seasonal?.id) markPromoSeen(seasonal.id);
    markWelcomeSeen();
    finishSplash();
    const hash = seasonal?.menu_hash || (seasonal?.meal_id ? `#meal-${seasonal.meal_id}` : "");
    router.push(`/menu${hash}`);
  };

  if (!isRootEntry || mode === "hidden" || configLoading) {
    return null;
  }

  const bg = config?.background_color ?? "#F4F1DE";
  const primary = config?.primary_color ?? "#004D40";

  if (mode === "seasonal" && seasonal) {
    return (
      <div
        className="fixed inset-0 z-[100] flex flex-col items-center justify-between overflow-y-auto px-0 py-0"
        style={{ backgroundColor: bg, color: primary }}
      >
        <div className="flex w-full max-w-lg flex-1 flex-col">
          {seasonal.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={seasonal.image_url}
              alt=""
              className="h-[42vh] w-full object-cover sm:h-[48vh]"
            />
          ) : (
            <div className="flex h-[30vh] items-center justify-center text-sm opacity-70">
              Seasonal offer
            </div>
          )}
          <div className="flex flex-1 flex-col px-6 py-6 text-center">
            <h1 className="text-2xl font-bold">{seasonal.headline}</h1>
            {seasonal.subheadline && (
              <p className="mt-2 text-base opacity-85">{seasonal.subheadline}</p>
            )}
            {seasonal.details && (
              <p className="mt-4 text-sm leading-relaxed opacity-80">{seasonal.details}</p>
            )}
            <div className="mt-auto flex flex-col gap-3 pt-8">
              <CustomerButton
                onClick={handleSeasonalCta}
                className="w-full"
                style={{ backgroundColor: primary, borderColor: primary }}
              >
                {seasonal.cta_label || "View on menu"}
              </CustomerButton>
              <CustomerButton variant="secondary" onClick={handleSeasonalSkip} className="w-full">
                Skip to home
              </CustomerButton>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!config?.splash_enabled) {
    return null;
  }

  if (mode === "loading") {
    return (
      <div
        className="fixed inset-0 z-[100] flex flex-col items-center justify-center px-6"
        style={{ backgroundColor: bg, color: primary }}
      >
        {config.logo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={config.logo_url}
            alt={config.app_name ?? "KhayaOS"}
            className="mb-6 h-24 w-24 rounded-full object-cover shadow-lg"
          />
        ) : (
          <div
            className="mb-6 flex h-24 w-24 items-center justify-center rounded-full text-4xl font-bold text-white shadow-lg"
            style={{ backgroundColor: primary }}
          >
            {config.app_name?.charAt(0) ?? "K"}
          </div>
        )}
        <p className="text-sm font-semibold uppercase tracking-[0.18em]">Loading</p>
        <div className="mt-4 h-1 w-32 overflow-hidden rounded-full bg-black/10">
          <div
            className="customer-shimmer h-full w-full rounded-full"
            style={{ backgroundColor: primary, opacity: 0.45 }}
          />
        </div>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col items-center justify-between px-6 py-10"
      style={{ backgroundColor: bg, color: primary }}
    >
      <div className="flex w-full max-w-sm flex-1 flex-col items-center justify-center text-center">
        <p className="text-sm font-bold uppercase tracking-[0.2em]">
          {config.splash_headline ?? "Let's get started"}
        </p>

        <div className="my-8 flex w-full flex-col items-center gap-4">
          {config.splash_image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={config.splash_image_url}
              alt=""
              className="h-48 w-full max-w-xs rounded-2xl object-cover shadow-lg"
            />
          ) : config.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={config.logo_url}
              alt={config.app_name}
              className="h-32 w-32 rounded-full object-cover shadow-lg"
            />
          ) : (
            <div
              className="flex h-32 w-32 items-center justify-center rounded-full text-4xl font-bold text-white shadow-lg"
              style={{ backgroundColor: primary }}
            >
              {config.app_name?.charAt(0) ?? "K"}
            </div>
          )}
        </div>

        <h1 className="text-2xl font-bold">{config.app_name ?? "KhayaOS"}</h1>
        {config.splash_subheadline && (
          <p className="mt-2 text-sm opacity-80">{config.splash_subheadline}</p>
        )}
      </div>

      <div className="flex w-full max-w-sm flex-col gap-3">
        <CustomerButton
          onClick={handleSignup}
          className="w-full"
          style={{ backgroundColor: primary, borderColor: primary }}
        >
          Sign up
        </CustomerButton>
        <CustomerButton variant="secondary" onClick={handleGuest} className="w-full">
          Continue as guest
        </CustomerButton>
      </div>
    </div>
  );
}
