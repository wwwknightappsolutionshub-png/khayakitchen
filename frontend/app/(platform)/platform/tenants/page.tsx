"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { ModalPortal } from "@/components/ui/ModalPortal";
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
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: "",
    slug: "",
    owner_name: "",
    owner_email: "",
    owner_password: "",
    primary_color: "",
  });
  const [overrideTenantId, setOverrideTenantId] = useState<string | null>(null);
  const [brandingTenantId, setBrandingTenantId] = useState<string | null>(null);
  const [brandingForm, setBrandingForm] = useState({
    logo_url: "",
    primary_color: "",
    secondary_color: "",
    accent_color: "",
    banner_image: "",
  });
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

  const brandingMutation = useMutation({
    mutationFn: (tenantId: string) =>
      platformService.overrideBranding(tenantId, {
        logo_url: brandingForm.logo_url || undefined,
        primary_color: brandingForm.primary_color || undefined,
        secondary_color: brandingForm.secondary_color || undefined,
        accent_color: brandingForm.accent_color || undefined,
        banner_image: brandingForm.banner_image || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["platform", "tenants"] });
      setBrandingTenantId(null);
    },
  });

  const clearBrandingMutation = useMutation({
    mutationFn: (tenantId: string) => platformService.clearBrandingOverride(tenantId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["platform", "tenants"] });
      setBrandingTenantId(null);
    },
  });

  const createMutation = useMutation({
    mutationFn: () =>
      platformService.createTenant({
        name: createForm.name,
        slug: createForm.slug,
        owner_name: createForm.owner_name || undefined,
        owner_email: createForm.owner_email || undefined,
        owner_password: createForm.owner_password || undefined,
        primary_color: createForm.primary_color || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["platform", "tenants"] });
      setShowCreateModal(false);
      setCreateForm({
        name: "",
        slug: "",
        owner_name: "",
        owner_email: "",
        owner_password: "",
        primary_color: "",
      });
    },
  });

  const tenants = data?.tenants ?? [];

  return (
    <div className="animate-fade-in">
      <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-violet-50">Tenants</h1>
          <p className="text-sm text-violet-200/60">All restaurants on the platform</p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="h-4 w-4" />
          Create tenant
        </Button>
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
                        <div className="flex flex-wrap gap-2">
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => setOverrideTenantId(tenant.id)}
                          >
                            Override status
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setBrandingForm({
                                logo_url: "",
                                primary_color: "",
                                secondary_color: "",
                                accent_color: "",
                                banner_image: "",
                              });
                              setBrandingTenantId(tenant.id);
                            }}
                          >
                            Override branding
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {brandingTenantId && (
        <Card className="mt-6 border-violet-500/20 bg-[#0f1117]">
          <CardHeader>
            <CardTitle>Super admin branding override</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted">
              Platform branding overrides owner settings on the customer PWA. All changes are audit logged.
            </p>
            <Input
              label="Logo URL"
              value={brandingForm.logo_url}
              onChange={(e) => setBrandingForm((f) => ({ ...f, logo_url: e.target.value }))}
            />
            <div className="grid gap-4 sm:grid-cols-3">
              <Input
                label="Primary color"
                value={brandingForm.primary_color}
                onChange={(e) => setBrandingForm((f) => ({ ...f, primary_color: e.target.value }))}
                placeholder="#E07A5F"
              />
              <Input
                label="Secondary color"
                value={brandingForm.secondary_color}
                onChange={(e) => setBrandingForm((f) => ({ ...f, secondary_color: e.target.value }))}
                placeholder="#81B29A"
              />
              <Input
                label="Accent color"
                value={brandingForm.accent_color}
                onChange={(e) => setBrandingForm((f) => ({ ...f, accent_color: e.target.value }))}
                placeholder="#F2CC8F"
              />
            </div>
            <Input
              label="Brand banner URL"
              value={brandingForm.banner_image}
              onChange={(e) => setBrandingForm((f) => ({ ...f, banner_image: e.target.value }))}
            />
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={() => brandingMutation.mutate(brandingTenantId)}
                isLoading={brandingMutation.isPending}
              >
                Apply branding override
              </Button>
              <Button
                variant="secondary"
                onClick={() => clearBrandingMutation.mutate(brandingTenantId)}
                isLoading={clearBrandingMutation.isPending}
              >
                Clear override
              </Button>
              <Button variant="ghost" onClick={() => setBrandingTenantId(null)}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

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

      <ModalPortal open={showCreateModal} onClose={() => setShowCreateModal(false)}>
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
          <button
            type="button"
            className="absolute inset-0 bg-black/70"
            onClick={() => setShowCreateModal(false)}
            aria-label="Close"
          />
          <Card className="relative z-10 w-full max-w-lg border-violet-500/20 bg-[#0f1117]">
            <CardHeader>
              <CardTitle>Create tenant</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                label="Restaurant name"
                value={createForm.name}
                onChange={(e) => setCreateForm((f) => ({ ...f, name: e.target.value }))}
              />
              <Input
                label="Slug"
                value={createForm.slug}
                onChange={(e) =>
                  setCreateForm((f) => ({
                    ...f,
                    slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""),
                  }))
                }
                placeholder="my-restaurant"
              />
              <Input
                label="Owner name (optional)"
                value={createForm.owner_name}
                onChange={(e) => setCreateForm((f) => ({ ...f, owner_name: e.target.value }))}
              />
              <Input
                label="Owner email (optional)"
                type="email"
                value={createForm.owner_email}
                onChange={(e) => setCreateForm((f) => ({ ...f, owner_email: e.target.value }))}
              />
              <Input
                label="Owner password (optional)"
                type="password"
                value={createForm.owner_password}
                onChange={(e) => setCreateForm((f) => ({ ...f, owner_password: e.target.value }))}
              />
              <Input
                label="Primary color (optional)"
                value={createForm.primary_color}
                onChange={(e) => setCreateForm((f) => ({ ...f, primary_color: e.target.value }))}
                placeholder="#FF6B35"
              />
              <div className="flex gap-2 pt-2">
                <Button
                  onClick={() => createMutation.mutate()}
                  isLoading={createMutation.isPending}
                  disabled={!createForm.name.trim() || !createForm.slug.trim()}
                >
                  Create tenant
                </Button>
                <Button variant="secondary" onClick={() => setShowCreateModal(false)}>
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </ModalPortal>
    </div>
  );
}
