"use client";

import { useQuery } from "@tanstack/react-query";
import { KpiCard } from "@/components/ui/KpiCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { CardSkeleton } from "@/components/ui/LoadingSkeleton";
import { ModuleStatusBoard } from "@/components/platform/ModuleStatusBoard";
import { ModuleTile } from "@/components/platform/ModuleTile";
import { platformService } from "@/services/platform.service";

export default function PlatformDashboardPage() {
  const { data: overview, isLoading: overviewLoading } = useQuery({
    queryKey: ["platform", "dashboard"],
    queryFn: () => platformService.getDashboard(),
  });

  const { data: modulesData, isLoading: modulesLoading } = useQuery({
    queryKey: ["platform", "modules"],
    queryFn: () => platformService.getModules(),
  });

  const modules = modulesData?.modules ?? [];
  const comingSoon = modules.filter((m) => m.status === "coming-soon");

  return (
    <div className="animate-fade-in">
      <header className="mb-8">
        <p className="text-xs font-medium uppercase tracking-widest text-violet-400">
          Platform Control
        </p>
        <h1 className="mt-1 text-2xl font-bold text-violet-50">System Dashboard</h1>
        <p className="text-sm text-violet-200/60">
          Cross-tenant overview — does not affect restaurant runtime
        </p>
      </header>

      <div className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {overviewLoading ? (
          Array.from({ length: 5 }).map((_, i) => <CardSkeleton key={i} />)
        ) : (
          <>
            <KpiCard label="Total Tenants" value={overview?.total_tenants ?? 0} />
            <KpiCard label="Active Tenants" value={overview?.active_tenants ?? 0} />
            <KpiCard label="Total Orders" value={overview?.total_orders ?? 0} />
            <KpiCard
              label="System Health"
              value={overview?.system_health ?? "—"}
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
    </div>
  );
}
