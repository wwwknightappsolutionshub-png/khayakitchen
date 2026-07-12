"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { notFound } from "next/navigation";
import { useState } from "react";
import { Check, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ApiClientError } from "@/lib/api-client";
import { pricingService } from "@/services/pricing.service";
import { formatCurrency } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth-store";

type BillingCycle = "monthly" | "yearly";

function formatLimit(value: number | undefined, unlimited?: boolean): string {
  if (unlimited) return "Unlimited";
  if (value === undefined) return "—";
  return value.toLocaleString();
}

export default function PublicPricingPage() {
  const isSuperAdmin = useAuthStore((s) => s.user?.role === "super_admin");
  const [cycle, setCycle] = useState<BillingCycle>("monthly");

  const { data, isLoading, error } = useQuery({
    queryKey: ["public-pricing"],
    queryFn: () => pricingService.getPublicPlans(),
    retry: false,
  });

  if (error instanceof ApiClientError && error.status === 404) {
    notFound();
  }

  const plans = data?.plans ?? [];
  const allFeatureKeys = Array.from(
    new Set(plans.flatMap((p) => p.features.map((f) => f.key))),
  );

  return (
    <div className="min-h-screen bg-[#0a0806] font-[family-name:var(--font-anek)] text-white">
      <header className="border-b border-white/10 px-6 py-4">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <Link href="/menu" className="text-lg font-semibold tracking-tight">
            Khaya Kitchen
          </Link>
          <div className="flex items-center gap-4 text-sm">
            <Link href="/menu" className="text-zinc-400 hover:text-white">
              Order
            </Link>
            <Link href="/pricing" className="text-zinc-400 hover:text-white">
              Pricing
            </Link>
            <Link href="/login" className="text-amber-400 hover:text-amber-300">
              Sign in
            </Link>
            {isSuperAdmin && (
              <Link href="/platform/pricing" className="text-amber-400 hover:text-amber-300">
                Manage Plans
              </Link>
            )}
            <Link
              href="/get-started?signup=1"
              className="rounded-full bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 px-4 py-1.5 font-semibold text-white hover:from-amber-400 hover:via-orange-400 hover:to-rose-400"
            >
              Sign up
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-12">
        <div className="mb-10 text-center">
          <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
            Simple pricing for growing restaurants
          </h1>
          <p className="mt-2 text-zinc-400">Choose the plan that fits your kitchen</p>

          <div className="mt-6 inline-flex rounded-full border border-white/10 bg-[#14100c] p-1">
            <button
              type="button"
              onClick={() => setCycle("monthly")}
              className={`rounded-full px-5 py-2 text-sm font-medium transition-colors ${
                cycle === "monthly" ? "bg-orange-600 text-white" : "text-zinc-400 hover:text-white"
              }`}
            >
              Monthly
            </button>
            <button
              type="button"
              onClick={() => setCycle("yearly")}
              className={`rounded-full px-5 py-2 text-sm font-medium transition-colors ${
                cycle === "yearly" ? "bg-orange-600 text-white" : "text-zinc-400 hover:text-white"
              }`}
            >
              Yearly
            </button>
          </div>
        </div>

        {isLoading && <p className="text-center text-zinc-500">Loading plans…</p>}

        {error && !(error instanceof ApiClientError && error.status === 404) && (
          <p className="text-center text-red-400">Unable to load pricing. Please try again later.</p>
        )}

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {plans.map((plan) => {
            const price = cycle === "monthly" ? plan.price_monthly : plan.price_yearly;
            const period = cycle === "monthly" ? "month" : "year";
            const accent = plan.plan_color ?? "#E07A5F";

            return (
              <article
                key={plan.id}
                className={`relative flex flex-col rounded-2xl border p-6 transition-transform hover:-translate-y-0.5 ${
                  plan.is_recommended
                    ? "border-orange-500/50 bg-gradient-to-b from-orange-950/40 to-[#14100c] shadow-lg shadow-orange-950/30"
                    : "border-white/10 bg-[#14100c]"
                }`}
                style={{ borderTopColor: accent, borderTopWidth: 3 }}
              >
                {plan.is_recommended && (
                  <Badge
                    variant="primary"
                    className="absolute -top-3 left-1/2 -translate-x-1/2 border border-orange-400/30 bg-orange-600/90 text-white"
                  >
                    <Sparkles className="mr-1 h-3 w-3" />
                    Recommended
                  </Badge>
                )}
                <h2 className="text-xl font-semibold">{plan.name}</h2>
                {plan.description && (
                  <p className="mt-1 text-sm text-zinc-400">{plan.description}</p>
                )}
                <p className="mt-4">
                  <span className="text-4xl font-bold">{formatCurrency(price, "GBP")}</span>
                  <span className="text-sm text-zinc-500"> / {period}</span>
                </p>
                {cycle === "yearly" && (
                  <p className="text-xs text-zinc-500">
                    {formatCurrency(plan.price_monthly, "GBP")}/mo billed annually
                  </p>
                )}

                <ul className="mt-6 flex-1 space-y-2 text-sm text-zinc-300">
                  {(plan.marketing_features ?? []).map((line) => (
                    <li key={line} className="flex items-start gap-2">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                      {line}
                    </li>
                  ))}
                  <li className="flex items-start gap-2 text-zinc-400">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400/70" />
                    Up to{" "}
                    {formatLimit(
                      plan.limits.max_menu_items as number,
                      plan.limits.unlimited_flags?.max_menu_items,
                    )}{" "}
                    menu items
                  </li>
                </ul>

                <Button
                  className="mt-6 w-full"
                  style={{ backgroundColor: accent }}
                  onClick={() => {
                    window.location.href = `/get-started?plan=${encodeURIComponent(plan.slug)}`;
                  }}
                >
                  {plan.cta_text ?? "Get started"}
                </Button>
              </article>
            );
          })}
        </div>

        {plans.length > 1 && allFeatureKeys.length > 0 && (
          <section className="mt-16">
            <h2 className="mb-6 text-center text-xl font-semibold">Compare plans</h2>
            <div className="overflow-x-auto rounded-2xl border border-white/10">
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="border-b border-white/10 bg-[#14100c]">
                    <th className="px-4 py-3 text-left font-medium text-zinc-400">Feature</th>
                    {plans.map((p) => (
                      <th key={p.id} className="px-4 py-3 text-center font-medium">
                        {p.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {allFeatureKeys.map((key) => {
                    const label = plans
                      .flatMap((p) => p.features)
                      .find((f) => f.key === key)?.name ?? key;
                    return (
                      <tr key={key} className="border-b border-white/5">
                        <td className="px-4 py-3 text-zinc-300">{label}</td>
                        {plans.map((p) => {
                          const included = p.features.some((f) => f.key === key);
                          return (
                            <td key={p.id} className="px-4 py-3 text-center">
                              {included ? (
                                <Check className="mx-auto h-4 w-4 text-emerald-400" />
                              ) : (
                                <span className="text-zinc-600">—</span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
