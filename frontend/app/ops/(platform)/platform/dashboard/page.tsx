"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { KpiCard } from "@/components/ui/KpiCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { CardSkeleton } from "@/components/ui/LoadingSkeleton";
import { Button } from "@/components/ui/Button";
import { ModuleStatusBoard } from "@/components/platform/ModuleStatusBoard";
import { ModuleTile } from "@/components/platform/ModuleTile";
import { platformService } from "@/services/platform.service";
import { platformSettingsService } from "@/services/platform-settings.service";
import { BackendPage } from "@/components/shared/BackendPage";
import { ApiClientError } from "@/lib/api-client";

export default function PlatformDashboardPage() {
  const queryClient = useQueryClient();
  const [flushMessage, setFlushMessage] = useState<string | null>(null);
  const [flushError, setFlushError] = useState<string | null>(null);

  const { data: overview, isLoading: overviewLoading } = useQuery({
    queryKey: ["platform", "dashboard"],
    queryFn: () => platformService.getDashboard(),
  });

  const { data: modulesData, isLoading: modulesLoading } = useQuery({
    queryKey: ["platform", "modules"],
    queryFn: () => platformService.getModules(),
  });

  const { data: queueData, isLoading: queueLoading } = useQuery({
    queryKey: ["platform", "whatsapp-queue"],
    queryFn: () => platformSettingsService.getWhatsAppQueue(),
    refetchInterval: 15_000,
  });

  const flushQueueMutation = useMutation({
    mutationFn: () =>
      platformSettingsService.flushWhatsAppQueue({
        include_failed: true,
        include_mixed: false,
      }),
    onSuccess: (response) => {
      setFlushError(null);
      setFlushMessage(
        `Purged ${response.flush.deleted_jobs} pending/reserved and ${response.flush.deleted_failed_jobs} failed WhatsApp job(s). New messages can enqueue cleanly.`,
      );
      queryClient.setQueryData(["platform", "whatsapp-queue"], { queue: response.queue });
    },
    onError: (err) => {
      setFlushMessage(null);
      setFlushError(
        err instanceof ApiClientError ? err.message : "Failed to purge WhatsApp queue.",
      );
    },
  });

  const modules = modulesData?.modules ?? [];
  const comingSoon = modules.filter((m) => m.status === "coming-soon");
  const queue = queueData?.queue;
  const backlog = (queue?.pending ?? 0) + (queue?.reserved ?? 0) + (queue?.failed ?? 0);

  return (
    <BackendPage>
      <header className="mb-8">
        <p className="text-xs font-medium uppercase tracking-widest text-violet-400">
          Platform Control
        </p>
        <h1 className="mt-1 text-2xl font-bold text-violet-50">System Dashboard</h1>
        <p className="text-sm text-violet-200/60">
          Cross-tenant overview — does not affect restaurant runtime
        </p>
      </header>

      <Card className="mb-8 border-violet-500/15 bg-[#0f1117]">
        <CardHeader>
          <CardTitle>WhatsApp queue</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-violet-200/70">
            Purge stale signup/order WhatsApp jobs before reconnecting Genius after a quota outage,
            so backlog does not burn monthly message credits.
          </p>
          {queueLoading ? (
            <p className="text-sm text-muted">Loading queue…</p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-[var(--radius)] border border-border/50 px-3 py-2">
                <p className="text-xs uppercase tracking-wide text-muted">Pending</p>
                <p className="mt-1 text-xl font-semibold text-violet-50">{queue?.pending ?? 0}</p>
              </div>
              <div className="rounded-[var(--radius)] border border-border/50 px-3 py-2">
                <p className="text-xs uppercase tracking-wide text-muted">Reserved / stuck</p>
                <p className="mt-1 text-xl font-semibold text-violet-50">{queue?.reserved ?? 0}</p>
              </div>
              <div className="rounded-[var(--radius)] border border-border/50 px-3 py-2">
                <p className="text-xs uppercase tracking-wide text-muted">Failed</p>
                <p className="mt-1 text-xl font-semibold text-violet-50">{queue?.failed ?? 0}</p>
              </div>
            </div>
          )}
          {flushError ? <p className="text-sm text-danger">{flushError}</p> : null}
          {flushMessage ? <p className="text-sm text-emerald-400">{flushMessage}</p> : null}
          <Button
            variant="danger"
            isLoading={flushQueueMutation.isPending}
            disabled={queueLoading || backlog === 0}
            onClick={() => {
              const ok = window.confirm(
                `Purge ${backlog} WhatsApp queue row(s) (pending, reserved, and failed)? This cannot be undone. Stop replaying backlog so only new messages send after Genius is ready.`,
              );
              if (!ok) return;
              setFlushError(null);
              setFlushMessage(null);
              flushQueueMutation.mutate();
            }}
          >
            Purge pending WhatsApp queue
          </Button>
        </CardContent>
      </Card>

      <div className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {overviewLoading ? (
          Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} />)
        ) : (
          <>
            <KpiCard label="Total Tenants" value={overview?.total_tenants ?? 0} />
            <KpiCard label="Active Tenants" value={overview?.active_tenants ?? 0} />
            <KpiCard label="Online now" value={overview?.tenants_online ?? 0} />
            <KpiCard label="Away" value={overview?.tenants_away ?? 0} />
          </>
        )}
      </div>

      <div className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {overviewLoading ? (
          Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={`pwa-${i}`} />)
        ) : (
          <>
            <KpiCard
              label="Tenants with staff PWA"
              value={overview?.tenants_with_staff_pwa ?? 0}
            />
            <KpiCard
              label="Tenants with customer PWA"
              value={overview?.tenants_with_customer_pwa ?? 0}
            />
            <KpiCard label="Customer PWAs installed" value={overview?.customers_with_pwa ?? 0} />
            <KpiCard label="Total Orders" value={overview?.total_orders ?? 0} />
          </>
        )}
      </div>

      <div className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {overviewLoading ? (
          Array.from({ length: 5 }).map((_, i) => <CardSkeleton key={`saas-${i}`} />)
        ) : (
          <>
            <KpiCard
              label="MRR"
              value={overview?.mrr != null ? `£${overview.mrr.toLocaleString()}` : "—"}
            />
            <KpiCard
              label="ARR"
              value={overview?.arr != null ? `£${overview.arr.toLocaleString()}` : "—"}
            />
            <KpiCard label="Upgrade Requests" value={overview?.upgrade_requests ?? 0} />
            <KpiCard
              label="Avg Menu Items"
              value={overview?.average_menu_count ?? "—"}
            />
            <KpiCard
              label="Modules Completed"
              value={`${overview?.modules_completed_pct ?? 0}%`}
            />
          </>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-violet-500/15 bg-[#0f1117]">
          <CardHeader>
            <CardTitle>Plan distribution</CardTitle>
          </CardHeader>
          <CardContent>
            {overviewLoading ? (
              <p className="text-sm text-muted">Loading…</p>
            ) : (overview?.plan_distribution ?? []).length > 0 ? (
              <ul className="space-y-3">
                {overview?.plan_distribution?.map((item) => (
                  <li key={item.plan_id} className="flex items-center justify-between text-sm">
                    <span className="font-medium text-violet-100">{item.plan_name}</span>
                    <span className="rounded-full bg-violet-600/20 px-3 py-0.5 font-mono text-violet-200">
                      {item.count} tenants
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted">No subscription data yet.</p>
            )}
          </CardContent>
        </Card>

        <Card className="border-violet-500/15 bg-[#0f1117]">
          <CardHeader>
            <CardTitle>Feature adoption</CardTitle>
          </CardHeader>
          <CardContent>
            {overviewLoading ? (
              <p className="text-sm text-muted">Loading…</p>
            ) : (overview?.feature_adoption ?? []).length > 0 ? (
              <ul className="max-h-64 space-y-2 overflow-y-auto text-sm">
                {overview?.feature_adoption?.map((f) => (
                  <li key={f.key} className="flex items-center justify-between gap-2">
                    <span className="text-violet-100">{f.name}</span>
                    <span className="text-muted">{f.plan_count} plans</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted">No feature adoption data.</p>
            )}
          </CardContent>
        </Card>

        <Card className="border-violet-500/15 bg-[#0f1117]">
          <CardHeader>
            <CardTitle>Module Status Board</CardTitle>
          </CardHeader>
          <CardContent>
            {modulesLoading ? (
              <p className="text-sm text-muted">Loading modules…</p>
            ) : (
              <ModuleStatusBoard modules={modules} />
            )}
          </CardContent>
        </Card>

        <Card className="border-violet-500/15 bg-[#0f1117]">
          <CardHeader>
            <CardTitle>Coming Soon</CardTitle>
          </CardHeader>
          <CardContent>
            {modulesLoading ? (
              <p className="text-sm text-muted">Loading…</p>
            ) : comingSoon.length > 0 ? (
              <div className="grid gap-3 sm:grid-cols-2">
                {comingSoon.map((module) => (
                  <ModuleTile
                    key={module.id}
                    name={module.name}
                    status={module.status}
                    description={module.description}
                  />
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted">No upcoming modules queued.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </BackendPage>
  );
}
