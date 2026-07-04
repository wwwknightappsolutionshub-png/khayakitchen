"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Grid3X3, Save } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import type { PricingFeature, PricingPlan } from "@/lib/types";
import { pricingService } from "@/services/pricing.service";

export default function PlatformFeatureAssignmentsPage() {
  const queryClient = useQueryClient();
  const [selectedPlanId, setSelectedPlanId] = useState<string>("");
  const [matrix, setMatrix] = useState<Record<string, Record<string, boolean>>>({});
  const [dirtyPlans, setDirtyPlans] = useState<Set<string>>(new Set());
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  const plansQuery = useQuery({
    queryKey: ["platform-plans"],
    queryFn: () => pricingService.getPlatformPlans(),
  });
  const featuresQuery = useQuery({
    queryKey: ["platform-features-flat"],
    queryFn: () => pricingService.getFeatures(false),
  });

  const plans = useMemo(
    () =>
      [...(plansQuery.data?.plans ?? [])]
        .filter((p) => !p.deleted_at)
        .sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0)),
    [plansQuery.data],
  );

  const features = useMemo(() => {
    const raw = featuresQuery.data?.features;
    if (!raw) return [] as PricingFeature[];
    if (Array.isArray(raw)) return raw.filter((f) => f.id && f.status !== "archived");
    return Object.values(raw)
      .flat()
      .filter((f) => f.id && f.status !== "archived");
  }, [featuresQuery.data]);

  useEffect(() => {
    if (!plans.length) return;
    const next: Record<string, Record<string, boolean>> = {};
    plans.forEach((plan) => {
      const row: Record<string, boolean> = {};
      features.forEach((f) => {
        if (!f.id) return;
        const assigned = plan.features?.find((pf) => pf.id === f.id || pf.key === f.key);
        row[f.id] = assigned?.pivot?.enabled ?? false;
      });
      next[plan.id] = row;
    });
    setMatrix(next);
    setSelectedPlanId((current) => current || plans[0]?.id || "");
  }, [plans, features]);

  const syncMutation = useMutation({
    mutationFn: (planId: string) =>
      pricingService.syncPlanFeatures(planId, matrix[planId] ?? {}),
    onSuccess: (_, planId) => {
      setDirtyPlans((prev) => {
        const next = new Set(prev);
        next.delete(planId);
        return next;
      });
      queryClient.invalidateQueries({ queryKey: ["platform-plans"] });
      setSaveMessage("Feature assignments saved.");
      setTimeout(() => setSaveMessage(null), 3000);
    },
  });

  const toggle = (planId: string, featureId: string) => {
    setMatrix((m) => ({
      ...m,
      [planId]: { ...m[planId], [featureId]: !m[planId]?.[featureId] },
    }));
    setDirtyPlans((prev) => new Set(prev).add(planId));
  };

  const selectedPlan = plans.find((p) => p.id === selectedPlanId);

  return (
    <div className="animate-fade-in">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Grid3X3 className="h-7 w-7 text-violet-400" />
          <div>
            <h1 className="text-2xl font-bold text-violet-50">Feature Assignments</h1>
            <p className="text-sm text-violet-200/60">Map features to subscription plans</p>
          </div>
        </div>
        {saveMessage && (
          <Badge variant="secondary">{saveMessage}</Badge>
        )}
      </header>

      <Card className="border-violet-500/20 bg-[#0f1118]">
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
          <CardTitle className="text-violet-50">Plan × Feature matrix</CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            <select
              className="h-10 rounded-[var(--radius)] border border-violet-500/20 bg-[#0a0c10] px-3 text-sm text-violet-100"
              value={selectedPlanId}
              onChange={(e) => setSelectedPlanId(e.target.value)}
            >
              {plans.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            {selectedPlanId && (
              <Button
                onClick={() => syncMutation.mutate(selectedPlanId)}
                isLoading={syncMutation.isPending}
                disabled={!dirtyPlans.has(selectedPlanId)}
              >
                <Save className="h-4 w-4" />
                Save {selectedPlan?.name}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {plansQuery.isLoading || featuresQuery.isLoading ? (
            <p className="text-sm text-muted">Loading matrix…</p>
          ) : features.length === 0 ? (
            <p className="text-sm text-muted">Add features in the Feature Library first.</p>
          ) : (
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-violet-500/20 text-left text-violet-300/60">
                  <th className="sticky left-0 bg-[#0f1118] px-3 py-3 font-medium">Feature</th>
                  {plans.map((plan: PricingPlan) => (
                    <th key={plan.id} className="px-3 py-3 text-center font-medium">
                      <span className="block">{plan.name}</span>
                      {dirtyPlans.has(plan.id) && (
                        <Badge variant="warning" className="mt-1 text-[10px]">
                          unsaved
                        </Badge>
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {features.map((feature) => (
                  <tr key={feature.id} className="border-b border-violet-500/10">
                    <td className="sticky left-0 bg-[#0f1118] px-3 py-2">
                      <span className="font-medium text-violet-100">{feature.name}</span>
                      <span className="ml-2 text-xs text-violet-300/50">{feature.key}</span>
                    </td>
                    {plans.map((plan) => (
                      <td key={plan.id} className="px-3 py-2 text-center">
                        <input
                          type="checkbox"
                          className="h-4 w-4 accent-violet-500"
                          checked={matrix[plan.id]?.[feature.id!] ?? false}
                          onChange={() => toggle(plan.id, feature.id!)}
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {plans.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2 border-t border-violet-500/10 pt-4">
              {plans
                .filter((p) => dirtyPlans.has(p.id))
                .map((p) => (
                  <Button
                    key={p.id}
                    size="sm"
                    variant="secondary"
                    onClick={() => syncMutation.mutate(p.id)}
                    isLoading={syncMutation.isPending}
                  >
                    Save {p.name}
                  </Button>
                ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
