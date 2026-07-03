"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { platformService } from "@/services/platform.service";

export default function PlatformFeatureFlagsPage() {
  const queryClient = useQueryClient();
  const [pending, setPending] = useState<Record<string, Record<string, boolean>>>({});

  const { data, isLoading } = useQuery({
    queryKey: ["platform", "feature-flags"],
    queryFn: () => platformService.getFeatureFlags(),
  });

  const mutation = useMutation({
    mutationFn: ({
      tenantId,
      flags,
    }: {
      tenantId: string;
      flags: Record<string, boolean>;
    }) => platformService.updateTenantFlags(tenantId, flags),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["platform", "feature-flags"] });
      setPending({});
    },
  });

  const tenants = data?.tenants ?? [];

  const getFlagValue = (tenantId: string, module: string, current: boolean) => {
    return pending[tenantId]?.[module] ?? current;
  };

  const toggleFlag = (tenantId: string, module: string, current: boolean) => {
    const next = !getFlagValue(tenantId, module, current);
    setPending((prev) => ({
      ...prev,
      [tenantId]: { ...prev[tenantId], [module]: next },
    }));
  };

  const saveTenant = (tenantId: string) => {
    const tenant = tenants.find((t) => t.tenant_id === tenantId);
    const changes = pending[tenantId];
    if (!tenant || !changes) return;
    mutation.mutate({ tenantId, flags: { ...tenant.flags, ...changes } });
  };

  return (
    <div className="animate-fade-in">
      <header className="mb-8">
        <h1 className="text-2xl font-bold text-violet-50">Feature Flags</h1>
        <p className="text-sm text-violet-200/60">
          Per-tenant module toggles — super admin only
        </p>
      </header>

      {isLoading ? (
        <p className="text-sm text-muted">Loading feature flags…</p>
      ) : (
        <div className="space-y-6">
          {tenants.map((tenant) => {
            const flagEntries = Object.entries(tenant.flags).sort(([a], [b]) =>
              a.localeCompare(b),
            );
            const hasPending = Boolean(pending[tenant.tenant_id]);

            return (
              <Card key={tenant.tenant_id} className="border-violet-500/15 bg-[#0f1117]">
                <CardHeader className="flex flex-row items-center justify-between gap-4">
                  <div>
                    <CardTitle>{tenant.tenant_name}</CardTitle>
                    <p className="text-xs text-muted">
                      {tenant.tenant_slug} · {tenant.tenant_status}
                    </p>
                  </div>
                  {hasPending && (
                    <Button
                      size="sm"
                      onClick={() => saveTenant(tenant.tenant_id)}
                      isLoading={mutation.isPending}
                    >
                      Save changes
                    </Button>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {flagEntries.map(([module, enabled]) => {
                      const value = getFlagValue(tenant.tenant_id, module, enabled);
                      return (
                        <button
                          key={module}
                          type="button"
                          onClick={() => toggleFlag(tenant.tenant_id, module, enabled)}
                          className="rounded-full focus:outline-none focus:ring-2 focus:ring-violet-500"
                        >
                          <Badge
                            variant={value ? "secondary" : "outline"}
                            className="cursor-pointer capitalize"
                          >
                            {module}: {value ? "enabled" : "disabled"}
                          </Badge>
                        </button>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
