"use client";

import { Suspense, useState } from "react";
import { SignupWizard } from "@/components/marketing/SignupWizard";
import { KitchenSignupSplash } from "@/components/marketing/KitchenSignupSplash";

function GetStartedContent() {
  const [showSplash, setShowSplash] = useState(true);

  return (
    <>
      {showSplash && <KitchenSignupSplash onComplete={() => setShowSplash(false)} />}
      <div className={showSplash ? "invisible" : "visible"}>
        <div className="mb-8 max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-violet-300">Get started</p>
          <h1 className="mt-2 text-4xl font-bold tracking-tight md:text-5xl">
            Discover KhayaOS, then launch your kitchen
          </h1>
          <p className="mt-4 text-base leading-relaxed text-zinc-400">
            Explore kitchen operations, customer experience, growth tools, and the platform — then complete
            enterprise onboarding to provision your tenant instantly.
          </p>
        </div>
        <SignupWizard />
      </div>
    </>
  );
}

export default function GetStartedPage() {
  return (
    <Suspense fallback={<p className="text-zinc-400">Loading wizard…</p>}>
      <GetStartedContent />
    </Suspense>
  );
}
