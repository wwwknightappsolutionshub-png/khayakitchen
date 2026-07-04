"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { ModuleStatusBoard } from "@/components/platform/ModuleStatusBoard";
import { ModuleTile } from "@/components/platform/ModuleTile";
import { platformService } from "@/services/platform.service";
import { BackendPage } from "@/components/shared/BackendPage";

export default function PlatformModulesPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["platform", "modules"],
    queryFn: () => platformService.getModules(),
  });

  const modules = data?.modules ?? [];
  const completed = modules.filter((m) => m.status === "completed");
  const upcoming = modules.filter(
    (m) => m.status === "coming-soon" || m.status === "disabled",
  );

  return (
    <BackendPage>
      <header className="mb-8">
        <h1 className="text-2xl font-bold text-violet-50">Module Registry</h1>
        <p className="text-sm text-violet-200/60">
          System-wide module catalog and rollout status
        </p>
      </header>

      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {completed.map((module) => (
          <ModuleTile
            key={module.id}
            name={module.name}
            status={module.status}
            description={module.description}
          />
        ))}
      </div>

      <Card className="mb-8 border-violet-500/15 bg-[#0f1117]">
        <CardHeader>
          <CardTitle>Full Registry</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted">Loading modules…</p>
          ) : (
            <ModuleStatusBoard modules={modules} />
          )}
        </CardContent>
      </Card>

      {upcoming.length > 0 && (
        <section>
          <h2 className="mb-4 text-lg font-semibold text-violet-100">Scaffolded / Coming Soon</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {upcoming.map((module) => (
              <ModuleTile
                key={module.id}
                name={module.name}
                status={module.status}
                description={module.description}
              />
            ))}
          </div>
        </section>
      )}
    </BackendPage>
  );
}
