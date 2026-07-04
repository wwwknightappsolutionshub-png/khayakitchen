"use client";

import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { platformSettingsService } from "@/services/platform-settings.service";
import { CustomerButton } from "@/components/customer/CustomerButton";

const WELCOME_STORAGE_KEY = "khayaos-welcome-seen";

function hasSeenWelcome(): boolean {
  if (typeof window === "undefined") return true;
  return localStorage.getItem(WELCOME_STORAGE_KEY) === "1";
}

function markWelcomeSeen(): void {
  localStorage.setItem(WELCOME_STORAGE_KEY, "1");
}

export function WelcomeSplashGate() {
  const router = useRouter();
  const [dismissed, setDismissed] = useState(hasSeenWelcome);

  const { data: config, isLoading } = useQuery({
    queryKey: ["platform", "public-config"],
    queryFn: () => platformSettingsService.getPublicConfig(),
    staleTime: 60_000,
  });

  const dismiss = useCallback(() => {
    markWelcomeSeen();
    setDismissed(true);
  }, []);

  const handleGuest = () => {
    dismiss();
  };

  const handleSignup = () => {
    markWelcomeSeen();
    setDismissed(true);
    router.push("/account?signup=1");
  };

  if (dismissed || isLoading || !config?.splash_enabled) {
    return null;
  }

  const bg = config.background_color ?? "#F4F1DE";
  const primary = config.primary_color ?? "#004D40";

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
            <img
              src={config.splash_image_url}
              alt=""
              className="h-48 w-full max-w-xs rounded-2xl object-cover shadow-lg"
            />
          ) : config.logo_url ? (
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
