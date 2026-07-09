"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { SignupWizard } from "@/components/marketing/SignupWizard";
import { marketingTheme } from "@/lib/marketing-theme";
import { cn } from "@/lib/utils";

function GetStartedContent() {
  const searchParams = useSearchParams();
  const startAtForm = searchParams.get("signup") === "1";

  return (
    <div>
      {startAtForm ? (
        <div className="mb-8 max-w-3xl">
          <p className={cn("text-sm font-semibold uppercase tracking-[0.18em]", marketingTheme.eyebrow)}>
            Get started
          </p>
          <h1 className="mt-2 text-4xl font-bold tracking-tight md:text-5xl">Create your KhayaOS workspace</h1>
          <p className="mt-4 text-base leading-relaxed text-zinc-400">
            Complete enterprise onboarding to provision your tenant instantly.
          </p>
        </div>
      ) : null}
      <SignupWizard startAtForm={startAtForm} />
    </div>
  );
}

export default function GetStartedPage() {
  return (
    <Suspense fallback={<p className="text-zinc-400">Loading signup wizard…</p>}>
      <GetStartedContent />
    </Suspense>
  );
}
