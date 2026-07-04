"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { ArrowUpCircle, Mail, Sparkles, X } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { ModalFrame } from "@/components/ui/ModalFrame";
import { formatLimitLabel, type LimitErrorInfo } from "@/lib/limit-error";
import { formatCurrency } from "@/lib/utils";
import { useEntitlements } from "@/hooks/useEntitlements";
import { pricingService } from "@/services/pricing.service";

interface UpgradeLimitModalProps {
  open: boolean;
  onClose: () => void;
  limitError: LimitErrorInfo | null;
}

export function UpgradeLimitModal({ open, onClose, limitError }: UpgradeLimitModalProps) {
  const { plan: currentPlan, usage } = useEntitlements();

  const recommendedQuery = useQuery({
    queryKey: ["platform-plans", limitError?.recommendedPlanId],
    queryFn: async () => {
      if (!limitError?.recommendedPlanId) return null;
      const { plan } = await pricingService.getPlan(limitError.recommendedPlanId);
      return plan;
    },
    enabled: open && !!limitError?.recommendedPlanId,
  });

  const upgradeMutation = useMutation({
    mutationFn: () =>
      pricingService.requestUpgrade({
        requested_plan_id: limitError?.recommendedPlanId,
        message: `Upgrade requested after hitting ${limitError?.limitKey} limit`,
      }),
    onSuccess: onClose,
  });

  if (!limitError) return null;

  const usageItem = usage?.[limitError.limitKey];
  const current = usageItem?.current ?? limitError.currentUsage;
  const max = usageItem?.max ?? limitError.maxAllowed;
  const recommended = recommendedQuery.data;
  const recommendedName = recommended?.name ?? limitError.recommendedPlanName;

  return (
    <ModalFrame open={open} onClose={onClose}>
        <Card className="overflow-hidden border-violet-500/30 bg-gradient-to-b from-[#14141f] to-[#0f1117] shadow-2xl shadow-violet-950/50">
          <div
            className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-violet-500 via-fuchsia-500 to-amber-400"
            aria-hidden
          />
          <CardHeader className="pb-2">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-600/20 text-violet-300">
                  <ArrowUpCircle className="h-6 w-6" />
                </div>
                <div>
                  <CardTitle className="text-lg text-violet-50">Plan limit reached</CardTitle>
                  <p className="mt-0.5 text-sm text-violet-200/60 capitalize">
                    {formatLimitLabel(limitError.limitKey)}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg p-1.5 text-violet-300/60 transition-colors hover:bg-violet-500/10 hover:text-violet-100"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            <p className="text-sm leading-relaxed text-violet-100/80">{limitError.message}</p>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-violet-500/20 bg-[#0a0c10]/80 p-4">
                <p className="text-xs font-medium uppercase tracking-wider text-violet-400/70">
                  Current plan
                </p>
                <p className="mt-1 font-semibold text-violet-50">{currentPlan?.name ?? "Your plan"}</p>
              </div>
              <div className="rounded-xl border border-violet-500/20 bg-[#0a0c10]/80 p-4">
                <p className="text-xs font-medium uppercase tracking-wider text-violet-400/70">Usage</p>
                <p className="mt-1 font-mono text-lg font-semibold text-violet-50">
                  {current}
                  <span className="text-sm font-normal text-violet-300/50"> / {max}</span>
                </p>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-violet-950">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500"
                    style={{ width: `${Math.min(100, max > 0 ? (current / max) * 100 : 100)}%` }}
                  />
                </div>
              </div>
            </div>

            {recommendedName && (
              <div className="rounded-xl border border-amber-500/25 bg-amber-500/5 p-4">
                <div className="mb-2 flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-amber-400" />
                  <span className="text-sm font-semibold text-amber-100">Recommended upgrade</span>
                  <Badge variant="warning" className="ml-auto">
                    {recommendedName}
                  </Badge>
                </div>
                {recommended && (
                  <div className="space-y-2 text-sm text-violet-200/70">
                    <p>
                      From{" "}
                      <span className="font-semibold text-violet-100">
                        {formatCurrency(recommended.price_monthly)}
                      </span>
                      /mo
                    </p>
                    {recommended.marketing_features && recommended.marketing_features.length > 0 && (
                      <ul className="space-y-1">
                        {recommended.marketing_features.slice(0, 4).map((feature) => (
                          <li key={feature} className="flex items-center gap-2">
                            <span className="text-emerald-400">✓</span>
                            {feature}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>
            )}

            <div className="flex flex-col gap-2 sm:flex-row">
              <Button
                className="flex-1"
                onClick={() => upgradeMutation.mutate()}
                isLoading={upgradeMutation.isPending}
                disabled={!limitError.recommendedPlanId && !recommendedName}
              >
                <ArrowUpCircle className="h-4 w-4" />
                Request upgrade
              </Button>
              <a
                href="mailto:sales@khayaos.com?subject=Plan%20upgrade%20inquiry"
                className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-[var(--radius)] border border-border bg-surface-elevated px-4 text-sm font-medium text-foreground transition-colors hover:bg-surface"
              >
                <Mail className="h-4 w-4" />
                Contact sales
              </a>
              <Button variant="ghost" onClick={onClose}>
                Close
              </Button>
            </div>

            <p className="text-center text-xs text-violet-300/40">
              Or browse{" "}
              <Link href="/pricing" className="text-violet-300 hover:underline" onClick={onClose}>
                public pricing
              </Link>
            </p>
          </CardContent>
        </Card>
    </ModalFrame>
  );
}
