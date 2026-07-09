"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { MapPin } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { revenueRecoveryService } from "@/services/revenue-recovery.service";
import { ApiClientError } from "@/lib/api-client";

export function RevenueRecoverySettingsCard() {
  const queryClient = useQueryClient();
  const [address, setAddress] = useState("");
  const [radius, setRadius] = useState("10");
  const [error, setError] = useState<string | null>(null);

  const settingsQuery = useQuery({
    queryKey: ["revenue-recovery", "settings"],
    queryFn: () => revenueRecoveryService.getSettings(),
  });

  const settings = settingsQuery.data?.settings;

  const mutation = useMutation({
    mutationFn: () =>
      revenueRecoveryService.updateSettings({
        kitchen_address_text: address.trim() || undefined,
        geofence_radius_km: Number(radius),
      }),
    onSuccess: () => {
      setError(null);
      queryClient.invalidateQueries({ queryKey: ["revenue-recovery"] });
      queryClient.invalidateQueries({ queryKey: ["storefront"] });
    },
    onError: (err) => {
      setError(err instanceof ApiClientError ? err.message : "Could not save settings.");
    },
  });

  const canEditRadius = settings?.tenant_can_edit_radius ?? true;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5 text-primary" />
          Proximity settings
        </CardTitle>
        <p className="text-sm text-muted">
          Set your kitchen pin for geofenced bait. Proximity must be enabled on your plan by KhayaOS
          platform admin.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {settings && (
          <div className="rounded-[var(--radius)] border border-border bg-surface-elevated p-3 text-sm">
            <p>
              Proximity:{" "}
              <span className="font-medium">{settings.proximity_enabled ? "Enabled" : "Disabled"}</span>
            </p>
            {settings.kitchen_address_text && (
              <p className="mt-1 text-muted">Current pin: {settings.kitchen_address_text}</p>
            )}
          </div>
        )}

        <Input
          label="Kitchen address"
          value={address || settings?.kitchen_address_text || ""}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="123 Main Street, Lagos"
        />

        <Input
          label="Geofence radius (km)"
          type="number"
          min={1}
          max={50}
          value={radius || String(settings?.geofence_radius_km ?? 10)}
          onChange={(e) => setRadius(e.target.value)}
          disabled={!canEditRadius}
        />

        {!canEditRadius && (
          <p className="text-xs text-muted">Radius editing is locked by your platform administrator.</p>
        )}

        {error && <p className="text-sm text-red-400">{error}</p>}

        <Button
          onClick={() => mutation.mutate()}
          isLoading={mutation.isPending}
          disabled={!address.trim() && !settings?.kitchen_address_text}
        >
          Save kitchen location
        </Button>
      </CardContent>
    </Card>
  );
}
