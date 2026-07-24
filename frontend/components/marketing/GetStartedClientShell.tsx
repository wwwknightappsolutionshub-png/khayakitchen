"use client";

import { Suspense, useMemo } from "react";
import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import { GetStartedMarketingHero } from "@/components/marketing/GetStartedMarketingHero";
import { marketingTheme } from "@/lib/marketing-theme";
import { cn } from "@/lib/utils";

const SignupWizard = dynamic(
  () => import("@/components/marketing/SignupWizard").then((m) => m.SignupWizard),
  {
    ssr: false,
    loading: () => <p className="text-sm text-zinc-400">Loading signup…</p>,
  },
);

const MarketingVisitorRotator = dynamic(
  () =>
    import("@/components/marketing/MarketingVisitorRotator").then(
      (m) => m.MarketingVisitorRotator,
    ),
  { ssr: false },
);

const MarketingChatbot = dynamic(
  () => import("@/components/marketing/MarketingChatbot").then((m) => m.MarketingChatbot),
  { ssr: false },
);

const MarketingPwaInstallGate = dynamic(
  () =>
    import("@/components/marketing/MarketingPwaInstallGate").then(
      (m) => m.MarketingPwaInstallGate,
    ),
  { ssr: false },
);

function buildSignupHref(searchParams: URLSearchParams): string {
  const next = new URLSearchParams(searchParams.toString());
  next.set("signup", "1");
  const qs = next.toString();
  return qs ? `/get-started?${qs}` : "/get-started?signup=1";
}

function GetStartedClient() {
  const searchParams = useSearchParams();
  const startAtForm = searchParams.get("signup") === "1";
  const signupHref = useMemo(() => buildSignupHref(searchParams), [searchParams]);

  if (startAtForm) {
    return (
      <div>
        <div className="mb-8 max-w-3xl">
          <p className={cn("text-sm font-semibold uppercase tracking-[0.18em]", marketingTheme.eyebrow)}>
            Get started
          </p>
          <h1 className="mt-2 text-4xl font-bold tracking-tight md:text-5xl">
            Create your KhayaOS workspace
          </h1>
          <p className="mt-4 text-base leading-relaxed text-zinc-400">
            Complete enterprise onboarding to provision your tenant instantly.
          </p>
        </div>
        <SignupWizard startAtForm />
        <MarketingChatbot />
      </div>
    );
  }

  return (
    <>
      <GetStartedMarketingHero signupHref={signupHref} />
      <MarketingVisitorRotator />
      <MarketingChatbot />
      <MarketingPwaInstallGate />
    </>
  );
}

export function GetStartedClientShell() {
  return (
    <Suspense fallback={<GetStartedMarketingHero signupHref="/get-started?signup=1" />}>
      <GetStartedClient />
    </Suspense>
  );
}
