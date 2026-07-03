"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { pricingService } from "@/services/pricing.service";
import { formatCurrency } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth-store";

export default function PublicPricingPage() {
  const isSuperAdmin = useAuthStore((s) => s.user?.role === "super_admin");

  const { data, isLoading } = useQuery({
    queryKey: ["public-pricing"],
    queryFn: () => pricingService.getPublicPlans(),
  });

  const plans = data?.plans ?? [];

  return (
    <div className="min-h-screen bg-[#0f0f10] text-white">
      <header className="border-b border-white/10 px-6 py-4">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <Link href="/menu" className="text-lg font-semibold tracking-tight">
            Khaya Kitchen
          </Link>
          <div className="flex gap-4 text-sm">
            <Link href="/menu" className="text-zinc-400 hover:text-white">
              Order
            </Link>
            {isSuperAdmin && (
              <Link href="/platform/pricing" className="text-violet-400 hover:text-violet-300">
                Manage Plans
              </Link>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-12">
        <div className="mb-10 text-center">
          <h1 className="text-3xl font-bold tracking-tight">Simple pricing for growing restaurants</h1>
          <p className="mt-2 text-zinc-400">
            {data?.demo_mode ? "Presentation mode — visible plans only" : "Choose the plan that fits your kitchen"}
          </p>
        </div>

        {isLoading && <p className="text-center text-zinc-500">Loading plans…</p>}

        <div className="grid gap-6 md:grid-cols-3">
          {plans.map((plan) => (
            <article
              key={plan.id}
              className="rounded-2xl border border-white/10 bg-[#1a1a1d] p-6"
            >
              <h2 className="text-xl font-semibold">{plan.name}</h2>
              <p className="mt-3">
                <span className="text-3xl font-bold">{formatCurrency(plan.price_monthly)}</span>
                <span className="text-sm text-zinc-500"> / month</span>
              </p>
              <p className="text-sm text-zinc-500">
                or {formatCurrency(plan.price_yearly)} / year
              </p>

              <ul className="mt-6 space-y-2 text-sm text-zinc-300">
                <li>Up to {plan.max_menu_items} menu items</li>
                <li>{plan.max_orders_per_day} orders / day</li>
                <li>{plan.max_customers.toLocaleString()} customers</li>
              </ul>

              {plan.features && plan.features.length > 0 && (
                <div className="mt-6 border-t border-white/10 pt-4">
                  <p className="mb-2 text-xs font-medium uppercase tracking-wider text-zinc-500">
                    Includes
                  </p>
                  <ul className="space-y-1 text-sm text-zinc-400">
                    {plan.features.map((f) => (
                      <li key={f.key}>✓ {f.name}</li>
                    ))}
                  </ul>
                </div>
              )}
            </article>
          ))}
        </div>
      </main>
    </div>
  );
}
