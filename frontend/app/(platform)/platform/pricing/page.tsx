"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CreditCard, Layers, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { pricingService } from "@/services/pricing.service";
import { platformService } from "@/services/platform.service";
import { formatCurrency } from "@/lib/utils";

type Tab = "plans" | "features" | "subscriptions";

export default function PlatformPricingPage() {
  const [tab, setTab] = useState<Tab>("plans");
  const [assignTenant, setAssignTenant] = useState("");
  const [assignPlan, setAssignPlan] = useState("");
  const queryClient = useQueryClient();

  const plansQuery = useQuery({ queryKey: ["platform-plans"], queryFn: () => pricingService.getPlatformPlans() });
  const featuresQuery = useQuery({ queryKey: ["platform-features"], queryFn: () => pricingService.getFeatures() });
  const subsQuery = useQuery({ queryKey: ["platform-subscriptions"], queryFn: () => pricingService.getSubscriptions() });
  const tenantsQuery = useQuery({ queryKey: ["platform-tenants"], queryFn: () => platformService.getTenants() });

  const visibilityMutation = useMutation({
    mutationFn: ({ id, visible }: { id: string; visible: boolean }) =>
      pricingService.setPlanVisibility(id, visible),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["platform-plans"] }),
  });

  const assignMutation = useMutation({
    mutationFn: () =>
      pricingService.assignSubscription({ tenant_id: assignTenant, plan_id: assignPlan }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["platform-subscriptions"] });
      setAssignTenant("");
      setAssignPlan("");
    },
  });

  const plans = plansQuery.data?.plans ?? [];
  const featuresByCategory = featuresQuery.data?.features ?? {};
  const subscriptions = subsQuery.data?.subscriptions ?? [];
  const tenants = tenantsQuery.data?.tenants ?? [];

  return (
    <div className="animate-fade-in">
      <header className="mb-6">
        <div className="flex items-center gap-3">
          <CreditCard className="h-7 w-7 text-violet-400" />
          <div>
            <h1 className="text-2xl font-bold text-violet-50">Pricing & Entitlements</h1>
            <p className="text-sm text-violet-200/60">Plans, features, and tenant subscriptions</p>
          </div>
        </div>
      </header>

      <div className="mb-6 flex gap-2">
        {(["plans", "features", "subscriptions"] as Tab[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`rounded-lg px-4 py-2 text-sm font-medium capitalize ${
              tab === t ? "bg-violet-600/30 text-violet-100" : "text-violet-200/50 hover:text-violet-100"
            }`}
          >
            {t}
          </button>
        ))}
        <a
          href="/pricing"
          target="_blank"
          rel="noreferrer"
          className="ml-auto text-sm text-violet-300 hover:underline"
        >
          View public pricing →
        </a>
      </div>

      {tab === "plans" && (
        <div className="grid gap-4 lg:grid-cols-2">
          {plans.map((plan) => (
            <Card key={plan.id} className="border-violet-500/20 bg-[#0f1118]">
              <CardHeader className="flex flex-row items-start justify-between">
                <div>
                  <CardTitle className="text-violet-50">{plan.name}</CardTitle>
                  <p className="mt-1 font-mono text-violet-200">
                    {formatCurrency(plan.price_monthly)}/mo · {formatCurrency(plan.price_yearly)}/yr
                  </p>
                </div>
                <div className="flex gap-1">
                  {plan.is_visible ? (
                    <Badge variant="outline">Visible</Badge>
                  ) : (
                    <Badge variant="outline">Hidden</Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-violet-200/70">
                <p>
                  Limits: {plan.max_menu_items} meals · {plan.max_orders_per_day} orders/day ·{" "}
                  {plan.max_customers} customers
                </p>
                <div className="flex flex-wrap gap-1">
                  {plan.features?.filter((f) => f.pivot?.enabled).map((f) => (
                    <Badge key={f.key} variant="outline" className="text-xs">
                      {f.name}
                    </Badge>
                  ))}
                </div>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() =>
                    visibilityMutation.mutate({ id: plan.id, visible: !plan.is_visible })
                  }
                >
                  Toggle demo visibility
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {tab === "features" && (
        <div className="space-y-6">
          {Object.entries(featuresByCategory).map(([category, features]) => (
            <Card key={category} className="border-violet-500/20 bg-[#0f1118]">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-violet-50 capitalize">
                  <Layers className="h-4 w-4" />
                  {category}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-violet-200/80">
                  {features.map((f) => (
                    <li key={f.id ?? f.key}>
                      <span className="font-medium">{f.name}</span>
                      <span className="ml-2 text-violet-300/50">({f.key})</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {tab === "subscriptions" && (
        <div className="space-y-6">
          <Card className="border-violet-500/20 bg-[#0f1118]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-violet-50">
                <Users className="h-4 w-4" />
                Assign plan to tenant
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-3">
              <select
                className="h-10 rounded-[var(--radius)] border border-violet-500/20 bg-[#0a0c10] px-3 text-sm text-violet-100"
                value={assignTenant}
                onChange={(e) => setAssignTenant(e.target.value)}
              >
                <option value="">Select tenant</option>
                {tenants.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
              <select
                className="h-10 rounded-[var(--radius)] border border-violet-500/20 bg-[#0a0c10] px-3 text-sm text-violet-100"
                value={assignPlan}
                onChange={(e) => setAssignPlan(e.target.value)}
              >
                <option value="">Select plan</option>
                {plans.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
              <Button
                onClick={() => assignMutation.mutate()}
                disabled={!assignTenant || !assignPlan}
                isLoading={assignMutation.isPending}
              >
                Assign
              </Button>
            </CardContent>
          </Card>

          <Card className="border-violet-500/20 bg-[#0f1118]">
            <CardContent className="pt-6">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-violet-500/20 text-left text-violet-300/60">
                    <th className="pb-3 font-medium">Tenant</th>
                    <th className="pb-3 font-medium">Plan</th>
                    <th className="pb-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {subscriptions.map((sub) => (
                    <tr key={sub.id} className="border-b border-violet-500/10">
                      <td className="py-3 text-violet-100">{sub.tenant?.name ?? sub.tenant_id}</td>
                      <td className="py-3 text-violet-200">{sub.plan?.name ?? sub.plan_id}</td>
                      <td className="py-3">
                        <Badge variant="outline">{sub.status}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
