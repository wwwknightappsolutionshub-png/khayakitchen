"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Radar } from "lucide-react";
import { BackendPage } from "@/components/shared/BackendPage";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { platformRevenueRecoveryService } from "@/services/platform-revenue-recovery.service";
import type { TenantRevenueRecoverySettings } from "@/lib/types";
import { ApiClientError } from "@/lib/api-client";

export default function PlatformRevenueRecoveryPage() {
  const queryClient = useQueryClient();
  const [selectedTenantId, setSelectedTenantId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Partial<TenantRevenueRecoverySettings>>({});
  const [address, setAddress] = useState("");
  const [error, setError] = useState<string | null>(null);

  const listQuery = useQuery({
    queryKey: ["platform", "revenue-recovery"],
    queryFn: () => platformRevenueRecoveryService.listTenants(),
  });

  const tenants = listQuery.data?.tenants ?? [];
  const selected =
    tenants.find((t) => t.tenant_id === selectedTenantId) ?? tenants[0] ?? null;

  useEffect(() => {
    if (!selectedTenantId && tenants[0]) {
      setSelectedTenantId(tenants[0].tenant_id);
    }
  }, [tenants, selectedTenantId]);

  useEffect(() => {
    if (!selected) return;
    setDraft({
      time_based_enabled: selected.time_based_enabled,
      proximity_enabled: selected.proximity_enabled,
      geofence_radius_km: selected.geofence_radius_km,
      tenant_can_edit_radius: selected.tenant_can_edit_radius,
      max_daily_proximity_pushes_per_customer: selected.max_daily_proximity_pushes_per_customer,
      location_accuracy_max_meters: selected.location_accuracy_max_meters,
    });
    setAddress("");
    setError(null);
  }, [selected]);

  const mutation = useMutation({
    mutationFn: () =>
      platformRevenueRecoveryService.updateTenant(selected!.tenant_id, {
        time_based_enabled: draft.time_based_enabled,
        proximity_enabled: draft.proximity_enabled,
        geofence_radius_km: draft.geofence_radius_km,
        tenant_can_edit_radius: draft.tenant_can_edit_radius,
        max_daily_proximity_pushes_per_customer: draft.max_daily_proximity_pushes_per_customer,
        location_accuracy_max_meters: draft.location_accuracy_max_meters,
        kitchen_address_text: address.trim() || undefined,
      }),
    onSuccess: () => {
      setError(null);
      queryClient.invalidateQueries({ queryKey: ["platform", "revenue-recovery"] });
    },
    onError: (err) => {
      setError(err instanceof ApiClientError ? err.message : "Save failed.");
    },
  });

  return (
    <BackendPage>
      <header className="mb-8 flex items-center gap-3">
        <Radar className="h-7 w-7 text-violet-300" />
        <div>
          <h1 className="text-2xl font-bold text-violet-50">Revenue Recovery</h1>
          <p className="text-sm text-violet-200/60">
            Per-tenant geofence, proximity bait, and time-based campaign toggles
          </p>
        </div>
      </header>

      {listQuery.isLoading ? (
        <p className="text-sm text-muted">Loading tenant settings…</p>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
          <Card className="border-violet-500/15 bg-[#0f1117]">
            <CardHeader>
              <CardTitle className="text-base">Tenants</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {tenants.map((tenant) => (
                <button
                  key={tenant.tenant_id}
                  type="button"
                  onClick={() => setSelectedTenantId(tenant.tenant_id)}
                  className={`w-full rounded-[var(--radius)] border px-3 py-2 text-left text-sm transition-colors ${
                    selected?.tenant_id === tenant.tenant_id
                      ? "border-violet-500/40 bg-violet-600/15 text-violet-100"
                      : "border-violet-500/10 text-violet-200/70 hover:bg-violet-500/10"
                  }`}
                >
                  <p className="font-medium">{tenant.tenant_name ?? tenant.tenant_id}</p>
                  <p className="text-xs text-muted">{tenant.tenant_slug}</p>
                </button>
              ))}
            </CardContent>
          </Card>

          {selected && (
            <Card className="border-violet-500/15 bg-[#0f1117]">
              <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
                <div>
                  <CardTitle>{selected.tenant_name}</CardTitle>
                  <p className="text-xs text-muted">{selected.tenant_slug}</p>
                </div>
                <div className="flex gap-2">
                  <Badge variant={selected.time_based_enabled ? "primary" : "secondary"}>
                    Time-based {selected.time_based_enabled ? "on" : "off"}
                  </Badge>
                  <Badge variant={selected.proximity_enabled ? "primary" : "secondary"}>
                    Proximity {selected.proximity_enabled ? "on" : "off"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <label className="flex items-center gap-3 text-sm">
                  <input
                    type="checkbox"
                    className="accent-violet-500"
                    checked={draft.time_based_enabled ?? false}
                    onChange={(e) =>
                      setDraft((prev) => ({ ...prev, time_based_enabled: e.target.checked }))
                    }
                  />
                  Enable time-based campaigns (happy hour, slow period)
                </label>

                <label className="flex items-center gap-3 text-sm">
                  <input
                    type="checkbox"
                    className="accent-violet-500"
                    checked={draft.proximity_enabled ?? false}
                    onChange={(e) =>
                      setDraft((prev) => ({ ...prev, proximity_enabled: e.target.checked }))
                    }
                  />
                  Enable proximity bait
                </label>

                <label className="flex items-center gap-3 text-sm">
                  <input
                    type="checkbox"
                    className="accent-violet-500"
                    checked={draft.tenant_can_edit_radius ?? true}
                    onChange={(e) =>
                      setDraft((prev) => ({ ...prev, tenant_can_edit_radius: e.target.checked }))
                    }
                  />
                  Tenant can edit geofence radius
                </label>

                <div className="grid gap-4 sm:grid-cols-2">
                  <Input
                    label="Geofence radius (km)"
                    type="number"
                    min={1}
                    max={50}
                    value={String(draft.geofence_radius_km ?? 10)}
                    onChange={(e) =>
                      setDraft((prev) => ({
                        ...prev,
                        geofence_radius_km: Number(e.target.value),
                      }))
                    }
                  />
                  <Input
                    label="Max daily proximity pushes / customer"
                    type="number"
                    min={1}
                    max={5}
                    value={String(draft.max_daily_proximity_pushes_per_customer ?? 1)}
                    onChange={(e) =>
                      setDraft((prev) => ({
                        ...prev,
                        max_daily_proximity_pushes_per_customer: Number(e.target.value),
                      }))
                    }
                  />
                  <Input
                    label="Location accuracy max (meters)"
                    type="number"
                    min={50}
                    max={2000}
                    value={String(draft.location_accuracy_max_meters ?? 500)}
                    onChange={(e) =>
                      setDraft((prev) => ({
                        ...prev,
                        location_accuracy_max_meters: Number(e.target.value),
                      }))
                    }
                  />
                </div>

                <Input
                  label="Kitchen address (geocoded via Google Maps)"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder={selected.kitchen_address_text ?? "Enter full kitchen address"}
                />

                {selected.kitchen_address_text && (
                  <p className="text-xs text-muted">
                    Current pin: {selected.kitchen_address_text}
                    {selected.kitchen_lat != null && selected.kitchen_lng != null
                      ? ` (${selected.kitchen_lat}, ${selected.kitchen_lng})`
                      : ""}
                  </p>
                )}

                {error && <p className="text-sm text-red-400">{error}</p>}

                <Button onClick={() => mutation.mutate()} isLoading={mutation.isPending}>
                  Save tenant settings
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </BackendPage>
  );
}
