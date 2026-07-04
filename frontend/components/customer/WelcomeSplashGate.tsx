"use client";

import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { platformSettingsService } from "@/services/platform-settings.service";
import { useStorefront } from "@/hooks/useStorefront";
import { CustomerButton } from "@/components/customer/CustomerButton";
import { dispatchSplashComplete } from "@/lib/splash-events";

const WELCOME_STORAGE_KEY = "khayaos-welcome-seen";

function hasSeenWelcome(): boolean {
  if (typeof window === "undefined") return true;
  return localStorage.getItem(WELCOME_STORAGE_KEY) === "1";
}

function markWelcomeSeen(): void {
  localStorage.setItem(WELCOME_STORAGE_KEY, "1");
}

type SplashMode = "welcome" | "loading" | "hidden";

export function WelcomeSplashGate() {
  const router = useRouter();
  const pathname = usePathname();
  const isRootEntry = pathname === "/";
  const firstVisit = !hasSeenWelcome();

  const [mode, setMode] = useState<SplashMode>(() => {
    if (!isRootEntry) return "hidden";
    return firstVisit ? "welcome" : "loading";
  });

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
      return;
    }
    if (!configLoading && config && !config.splash_enabled) {
      dispatchSplashComplete();
    }
  }, [isRootEntry, configLoading, config]);

  useEffect(() => {
    if (!isRootEntry) {
      setMode("hidden");
      return;
    }

    if (firstVisit) {
      setMode("welcome");
      return;
    }

    setMode("loading");
  }, [isRootEntry, firstVisit]);

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
  };

  const handleSignup = () => {
    markWelcomeSeen();
    finishSplash();
    router.push("/account?signup=1");
  };

  if (!isRootEntry || mode === "hidden" || configLoading || !config?.splash_enabled) {
    return null;
  }

  const bg = config.background_color ?? "#F4F1DE";
  const primary = config.primary_color ?? "#004D40";

  if (mode === "loading") {
    return (
      <div
        className="fixed inset-0 z-[100] flex flex-col items-center justify-center px-6"
        style={{ backgroundColor: bg, color: primary }}
      >
        {config.logo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={config.logo_url} alt={config.app_name ?? "KhayaOS"} className="mb-6 h-24 w-24 rounded-full object-cover shadow-lg" />
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
          <div className="customer-shimmer h-full w-full rounded-full" style={{ backgroundColor: primary, opacity: 0.45 }} />
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
