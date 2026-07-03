"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { platformService } from "@/services/platform.service";
import type { RestaurantOperationalStatus } from "@/lib/types";

const STATUS_OPTIONS: RestaurantOperationalStatus[] = [
  "open",
  "closing_soon",
  "closed",
  "promo_mode",
];

export default function PlatformTenantsPage() {
  const queryClient = useQueryClient();
  const [overrideTenantId, setOverrideTenantId] = useState<string | null>(null);
  const [overrideStatus, setOverrideStatus] = useState<RestaurantOperationalStatus>("open");
  const [overrideReason, setOverrideReason] = useState("");
  const [disablePromoAlerts, setDisablePromoAlerts] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["platform", "tenants"],
    queryFn: () => platformService.getTenants(),
  });

  const overrideMutation = useMutation({
    mutationFn: (tenantId: string) =>
      platformService.overrideRestaurantStatus(tenantId, {
        status: overrideStatus,
        promo_alerts_enabled: !disablePromoAlerts,
        reason: overrideReason || "Super admin override",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["platform", "tenants"] });
      setOverrideTenantId(null);
      setOverrideReason("");
    },
  });

  const tenants = data?.tenants ?? [];

  return (
    <div className="animate-fade-in">
      <header className="mb-8">
        <h1 className="text-2xl font-bold text-violet-50">Tenants</h1>
        <p className="text-sm text-violet-200/60">All restaurants on the platform</p>
      </header>

      <Card className="border-violet-500/15 bg-[#0f1117]">
        <CardHeader>
          <CardTitle>Tenant Overview</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted">Loading tenants…</p>
          ) : tenants.length === 0 ? (
            <p className="text-sm text-muted">No tenants registered yet.</p>
          ) : (
            <div className="overflow-hidden rounded-[var(--radius)] border border-border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-surface-elevated/50 text-left text-muted">
                    <th className="px-4 py-3 font-medium">Name</th>
                    <th className="px-4 py-3 font-medium">Slug</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Created</th>
                    <th className="px-4 py-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {tenants.map((tenant) => (
                    <tr
                      key={tenant.id}
                      className="border-b border-border last:border-0 hover:bg-surface-elevated/30"
                    >
                      <td className="px-4 py-3 font-medium">{tenant.name}</td>
                      <td className="px-4 py-3 font-mono text-muted">{tenant.slug}</td>
                      <td className="px-4 py-3">
                        <Badge variant={tenant.status === "active" ? "secondary" : "warning"}>
                          {tenant.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-muted">
                        {tenant.created_at
                          ? new Date(tenant.created_at).toLocaleDateString()
                          : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => setOverrideTenantId(tenant.id)}
                        >
                          Override status
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {overrideTenantId && (
        <Card className="mt-6 border-violet-500/20 bg-[#0f1117]">
          <CardHeader>
            <CardTitle>Super admin status override</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted">
              Force a restaurant operational status. All overrides are audit logged.
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              {STATUS_OPTIONS.map((status) => (
                <button
                  key={status}
                  type="button"
                  onClick={() => setOverrideStatus(status)}
                  className={`rounded-[var(--radius)] border px-4 py-3 text-left text-sm capitalize ${
                    overrideStatus === status
                      ? "border-primary bg-primary/10"
                      : "border-border hover:border-primary/30"
                  }`}
                >
                  {status.replace("_", " ")}
                </button>
              ))}
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">Reason (audit log)</label>
              <input
                className="w-full rounded-[var(--radius)] border border-border bg-surface-elevated px-3 py-2 text-sm"
                value={overrideReason}
                onChange={(e) => setOverrideReason(e.target.value)}
                placeholder="Why is this override needed?"
              />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={disablePromoAlerts}
                onChange={(e) => setDisablePromoAlerts(e.target.checked)}
              />
              Disable promo alerts for this override
            </label>
            <div className="flex gap-2">
              <Button
                onClick={() => overrideMutation.mutate(overrideTenantId)}
                isLoading={overrideMutation.isPending}
              >
                Apply override
              </Button>
              <Button variant="secondary" onClick={() => setOverrideTenantId(null)}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
