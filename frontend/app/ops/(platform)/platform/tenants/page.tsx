"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Hand, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { ColorField } from "@/components/ui/ColorField";
import { BackendPage } from "@/components/shared/BackendPage";
import { ModalFrame } from "@/components/ui/ModalFrame";
import { BACKEND_TABLE_CLASS, TableScroll } from "@/components/ui/TableScroll";
import { platformService } from "@/services/platform.service";
import { pricingService } from "@/services/pricing.service";
import type { PlatformTenant, RestaurantOperationalStatus } from "@/lib/types";
import { formatDate } from "@/lib/utils";
import { useToast } from "@/providers/ToastProvider";
import { ApiClientError } from "@/lib/api-client";

const STATUS_OPTIONS: RestaurantOperationalStatus[] = [
  "open",
  "closing_soon",
  "closed",
  "promo_mode",
];

function presenceBadgeVariant(
  presence?: PlatformTenant["presence"],
): "primary" | "warning" | "default" {
  if (presence === "online") return "primary";
  if (presence === "away") return "warning";
  return "default";
}

function formatRelative(iso?: string | null): string {
  if (!iso) return "Never";
  const ms = Date.now() - new Date(iso).getTime();
  if (Number.isNaN(ms) || ms < 0) return formatDate(iso);
  const mins = Math.floor(ms / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 48) return `${hours}h ago`;
  return formatDate(iso);
}

export default function PlatformTenantsPage() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
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
    ticker_enabled: true,
    ticker_text: "",
  });
  const [logoUploadProgress, setLogoUploadProgress] = useState<string | null>(null);
  const [bannerUploadProgress, setBannerUploadProgress] = useState<string | null>(null);
  const [logoUploading, setLogoUploading] = useState(false);
  const [bannerUploading, setBannerUploading] = useState(false);
  const [overrideStatus, setOverrideStatus] = useState<RestaurantOperationalStatus>("open");
  const [overrideReason, setOverrideReason] = useState("");
  const [disablePromoAlerts, setDisablePromoAlerts] = useState(false);
  const [entitlementsTenantId, setEntitlementsTenantId] = useState<string | null>(null);
  const [purgeTenant, setPurgeTenant] = useState<PlatformTenant | null>(null);
  const [purgeSlugConfirm, setPurgeSlugConfirm] = useState("");
  const [overrideFeatureKey, setOverrideFeatureKey] = useState("");
  const [overrideFeatureEnabled, setOverrideFeatureEnabled] = useState(true);
  const [overrideLimitKey, setOverrideLimitKey] = useState("max_menu_items");
  const [overrideLimitValue, setOverrideLimitValue] = useState("");
  const [overrideLimitUnlimited, setOverrideLimitUnlimited] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["platform", "tenants"],
    queryFn: () => platformService.getTenants(),
    refetchInterval: 30_000,
  });

  const pokeMutation = useMutation({
    mutationFn: (tenantId: string) => platformService.pokeTenant(tenantId),
    onSuccess: (res) => {
      showToast("Poke sent", `Delivered via ${res.channel}.`);
      queryClient.invalidateQueries({ queryKey: ["platform", "tenants"] });
    },
    onError: (err) => {
      showToast(
        "Poke failed",
        err instanceof ApiClientError ? err.message : "Could not poke this tenant.",
      );
    },
  });

  const entitlementsQuery = useQuery({
    queryKey: ["tenant-entitlements", entitlementsTenantId],
    queryFn: () => pricingService.getTenantEntitlements(entitlementsTenantId!),
    enabled: !!entitlementsTenantId,
  });

  const resetEntitlementsMutation = useMutation({
    mutationFn: (tenantId: string) =>
      pricingService.resetEntitlements(tenantId, "Super admin reset to plan defaults"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tenant-entitlements", entitlementsTenantId] });
    },
  });

  const featureOverrideMutation = useMutation({
    mutationFn: (tenantId: string) =>
      pricingService.setFeatureOverride(tenantId, {
        feature_key: overrideFeatureKey,
        enabled: overrideFeatureEnabled,
        reason: "Super admin override",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tenant-entitlements", entitlementsTenantId] });
      setOverrideFeatureKey("");
    },
  });

  const limitOverrideMutation = useMutation({
    mutationFn: (tenantId: string) =>
      pricingService.setLimitOverride(tenantId, {
        limit_key: overrideLimitKey,
        value: overrideLimitUnlimited ? null : Number(overrideLimitValue) || 0,
        is_unlimited: overrideLimitUnlimited,
        reason: "Super admin override",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tenant-entitlements", entitlementsTenantId] });
      setOverrideLimitValue("");
    },
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
        primary_color: brandingForm.primary_color || undefined,
        secondary_color: brandingForm.secondary_color || undefined,
        accent_color: brandingForm.accent_color || undefined,
        ticker_enabled: brandingForm.ticker_enabled,
        ticker_text: brandingForm.ticker_text || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["platform", "tenants"] });
      setBrandingTenantId(null);
    },
  });

  const handleBrandingLogoUpload = async (tenantId: string, file: File) => {
    setLogoUploading(true);
    setLogoUploadProgress("Uploading…");
    try {
      const response = (await platformService.uploadTenantBrandingLogo(tenantId, file)) as {
        branding?: { logo_url?: string | null };
      };
      setBrandingForm((f) => ({ ...f, logo_url: response.branding?.logo_url ?? f.logo_url }));
      setLogoUploadProgress("Upload complete");
      queryClient.invalidateQueries({ queryKey: ["platform", "tenants"] });
    } catch {
      setLogoUploadProgress("Upload failed — try again");
    } finally {
      setLogoUploading(false);
      setTimeout(() => setLogoUploadProgress(null), 3000);
    }
  };

  const handleBrandingBannerUpload = async (tenantId: string, file: File) => {
    setBannerUploading(true);
    setBannerUploadProgress("Uploading…");
    try {
      const response = (await platformService.uploadTenantBrandingBanner(tenantId, file)) as {
        branding?: { banner_image?: string | null };
      };
      setBrandingForm((f) => ({
        ...f,
        banner_image: response.branding?.banner_image ?? f.banner_image,
      }));
      setBannerUploadProgress("Upload complete");
      queryClient.invalidateQueries({ queryKey: ["platform", "tenants"] });
    } catch {
      setBannerUploadProgress("Upload failed — try again");
    } finally {
      setBannerUploading(false);
      setTimeout(() => setBannerUploadProgress(null), 3000);
    }
  };

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

  const purgeMutation = useMutation({
    mutationFn: () =>
      platformService.purgeTenant(purgeTenant!.id, {
        confirmation_slug: purgeSlugConfirm.trim(),
        confirm: true,
      }),
    onSuccess: (res) => {
      showToast("Kitchen deleted", `${res.slug} and all related data were permanently removed.`);
      queryClient.invalidateQueries({ queryKey: ["platform", "tenants"] });
      setPurgeTenant(null);
      setPurgeSlugConfirm("");
    },
    onError: (err) => {
      showToast(
        "Delete failed",
        err instanceof ApiClientError ? err.message : "Could not permanently delete this kitchen.",
      );
    },
  });

  const tenants = data?.tenants ?? [];

  return (
    <BackendPage>
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
            <TableScroll>
              <table className={BACKEND_TABLE_CLASS}>
                <thead>
                  <tr className="border-b border-border bg-surface-elevated/50 text-left text-muted">
                    <th className="px-4 py-3 font-medium">Name</th>
                    <th className="px-4 py-3 font-medium">Presence</th>
                    <th className="px-4 py-3 font-medium">Last online</th>
                    <th className="px-4 py-3 font-medium">Staff PWA</th>
                    <th className="px-4 py-3 font-medium">Customer PWAs</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {tenants.map((tenant) => (
                    <tr
                      key={tenant.id}
                      className="border-b border-border last:border-0 hover:bg-surface-elevated/30"
                    >
                      <td className="px-4 py-3">
                        <p className="font-medium">{tenant.name}</p>
                        <p className="font-mono text-xs text-muted">{tenant.slug}</p>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={presenceBadgeVariant(tenant.presence)}>
                          {tenant.presence ?? "offline"}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-sm text-muted">
                        {formatRelative(tenant.last_seen_at ?? tenant.last_login_at)}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {tenant.staff_pwa_installed
                          ? `Yes (${tenant.staff_pwa_installs ?? 1})`
                          : "No"}
                      </td>
                      <td className="px-4 py-3 text-sm font-mono">
                        {tenant.customer_pwa_installs ?? 0}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={tenant.status === "active" ? "secondary" : "warning"}>
                          {tenant.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-2">
                          <Button
                            size="sm"
                            variant="secondary"
                            className="gap-1"
                            isLoading={
                              pokeMutation.isPending && pokeMutation.variables === tenant.id
                            }
                            onClick={() => pokeMutation.mutate(tenant.id)}
                          >
                            <Hand className="h-3.5 w-3.5" />
                            Poke
                          </Button>
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
                                ticker_enabled: true,
                                ticker_text: "",
                              });
                              setBrandingTenantId(tenant.id);
                            }}
                          >
                            Override branding
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setEntitlementsTenantId(tenant.id)}
                          >
                            Entitlements
                          </Button>
                          <Button
                            size="sm"
                            variant="danger"
                            className="gap-1"
                            onClick={() => {
                              setPurgeSlugConfirm("");
                              setPurgeTenant(tenant);
                            }}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            Delete forever
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableScroll>
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
            <div>
              <label className="mb-1.5 block text-sm font-medium">Logo</label>
              {brandingForm.logo_url && (
                <img
                  src={brandingForm.logo_url}
                  alt="Logo preview"
                  className="mb-2 h-16 w-16 rounded-lg border border-border object-cover"
                />
              )}
              <input
                type="file"
                accept="image/*"
                disabled={logoUploading}
                className="block w-full text-sm text-muted file:mr-3 file:rounded-[var(--radius)] file:border-0 file:bg-primary file:px-3 file:py-2 file:text-sm file:font-medium file:text-white"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file && brandingTenantId) void handleBrandingLogoUpload(brandingTenantId, file);
                  e.target.value = "";
                }}
              />
              {logoUploadProgress && <p className="mt-1 text-xs text-muted">{logoUploadProgress}</p>}
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <ColorField
                label="Primary color"
                value={brandingForm.primary_color || "#E07A5F"}
                onChange={(hex) => setBrandingForm((f) => ({ ...f, primary_color: hex }))}
              />
              <ColorField
                label="Secondary color"
                value={brandingForm.secondary_color || "#81B29A"}
                onChange={(hex) => setBrandingForm((f) => ({ ...f, secondary_color: hex }))}
              />
              <ColorField
                label="Accent color"
                value={brandingForm.accent_color || "#F2CC8F"}
                onChange={(hex) => setBrandingForm((f) => ({ ...f, accent_color: hex }))}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">Brand banner</label>
              {brandingForm.banner_image && (
                <img
                  src={brandingForm.banner_image}
                  alt="Banner preview"
                  className="mb-2 h-24 w-full rounded-lg border border-border object-cover"
                />
              )}
              <input
                type="file"
                accept="image/*"
                disabled={bannerUploading}
                className="block w-full text-sm text-muted file:mr-3 file:rounded-[var(--radius)] file:border-0 file:bg-primary file:px-3 file:py-2 file:text-sm file:font-medium file:text-white"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file && brandingTenantId) {
                    void handleBrandingBannerUpload(brandingTenantId, file);
                  }
                  e.target.value = "";
                }}
              />
              {bannerUploadProgress && (
                <p className="mt-1 text-xs text-muted">{bannerUploadProgress}</p>
              )}
            </div>
            <div className="rounded-[var(--radius)] border border-border p-4">
              <p className="text-sm font-medium">News ticker override</p>
              <p className="mt-1 text-xs text-muted">
                Override or disable the scrolling header ticker for this tenant only.
              </p>
              <label className="mt-3 flex cursor-pointer items-center gap-3 text-sm">
                <input
                  type="checkbox"
                  checked={brandingForm.ticker_enabled}
                  onChange={(e) =>
                    setBrandingForm((f) => ({ ...f, ticker_enabled: e.target.checked }))
                  }
                />
                Show news ticker
              </label>
              <textarea
                rows={3}
                value={brandingForm.ticker_text}
                onChange={(e) => setBrandingForm((f) => ({ ...f, ticker_text: e.target.value }))}
                placeholder="Message one | Message two | Message three"
                className="mt-3 w-full rounded-[var(--radius)] border border-border bg-surface-elevated px-3 py-2 text-sm"
              />
            </div>
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

      {entitlementsTenantId && (
        <Card className="mt-6 border-violet-500/20 bg-[#0f1117]">
          <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
            <CardTitle>Tenant entitlements</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => setEntitlementsTenantId(null)}>
              Close
            </Button>
          </CardHeader>
          <CardContent className="space-y-6">
            {entitlementsQuery.isLoading ? (
              <p className="text-sm text-muted">Loading entitlements…</p>
            ) : (
              <>
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="rounded-[var(--radius)] border border-border p-4">
                    <p className="text-xs uppercase tracking-wider text-muted">Current plan</p>
                    <p className="mt-1 font-semibold">
                      {entitlementsQuery.data?.plan?.name ?? "No plan assigned"}
                    </p>
                    {entitlementsQuery.data?.subscription && (
                      <Badge variant="outline" className="mt-2 capitalize">
                        {entitlementsQuery.data.subscription.status}
                      </Badge>
                    )}
                  </div>
                  <div className="rounded-[var(--radius)] border border-border p-4 sm:col-span-2">
                    <p className="mb-2 text-xs uppercase tracking-wider text-muted">Usage</p>
                    <div className="grid gap-2 sm:grid-cols-3">
                      {Object.entries(entitlementsQuery.data?.usage ?? {})
                        .slice(0, 6)
                        .map(([key, item]) => (
                          <div key={key} className="text-sm">
                            <span className="text-muted capitalize">
                              {key.replace(/^max_/, "").replace(/_/g, " ")}
                            </span>
                            <p className="font-mono">
                              {item.current}
                              {item.unlimited ? " / ∞" : ` / ${item.max ?? "—"}`}
                            </p>
                          </div>
                        ))}
                    </div>
                  </div>
                </div>

                <div>
                  <p className="mb-2 text-sm font-medium">Subscription history</p>
                  <ul className="max-h-40 space-y-1 overflow-y-auto text-sm text-muted">
                    {(entitlementsQuery.data?.history ?? []).map((entry) => (
                      <li key={entry.id} className="flex justify-between gap-2 border-b border-border py-1">
                        <span className="capitalize">{entry.action.replace(/\./g, " ")}</span>
                        <span>{entry.created_at ? formatDate(entry.created_at) : "—"}</span>
                      </li>
                    ))}
                    {(entitlementsQuery.data?.history ?? []).length === 0 && (
                      <li>No history recorded</li>
                    )}
                  </ul>
                </div>

                <div>
                  <p className="mb-2 text-sm font-medium">Active overrides</p>
                  <ul className="space-y-1 text-sm">
                    {(entitlementsQuery.data?.overrides ?? []).map((o) => (
                      <li
                        key={o.id}
                        className="flex flex-wrap items-center gap-2 rounded-[var(--radius)] border border-border px-3 py-2"
                      >
                        <Badge variant="outline">{o.override_type}</Badge>
                        <span className="font-mono">{o.override_key}</span>
                        {o.override_type === "feature" && (
                          <span>{o.value_bool ? "enabled" : "disabled"}</span>
                        )}
                        {o.override_type === "limit" && (
                          <span>{o.is_unlimited ? "unlimited" : o.value_int}</span>
                        )}
                      </li>
                    ))}
                    {(entitlementsQuery.data?.overrides ?? []).length === 0 && (
                      <p className="text-sm text-muted">No overrides — using plan defaults</p>
                    )}
                  </ul>
                </div>

                <div className="grid gap-4 lg:grid-cols-2">
                  <div className="rounded-[var(--radius)] border border-dashed border-border p-4 space-y-3">
                    <p className="text-sm font-medium">Feature override</p>
                    <Input
                      label="Feature key"
                      value={overrideFeatureKey}
                      onChange={(e) => setOverrideFeatureKey(e.target.value)}
                      placeholder="delivery"
                    />
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={overrideFeatureEnabled}
                        onChange={(e) => setOverrideFeatureEnabled(e.target.checked)}
                      />
                      Enabled
                    </label>
                    <Button
                      size="sm"
                      onClick={() => featureOverrideMutation.mutate(entitlementsTenantId)}
                      disabled={!overrideFeatureKey.trim()}
                      isLoading={featureOverrideMutation.isPending}
                    >
                      Apply feature override
                    </Button>
                  </div>
                  <div className="rounded-[var(--radius)] border border-dashed border-border p-4 space-y-3">
                    <p className="text-sm font-medium">Limit override</p>
                    <Input
                      label="Limit key"
                      value={overrideLimitKey}
                      onChange={(e) => setOverrideLimitKey(e.target.value)}
                    />
                    <Input
                      label="Value"
                      type="number"
                      value={overrideLimitValue}
                      disabled={overrideLimitUnlimited}
                      onChange={(e) => setOverrideLimitValue(e.target.value)}
                    />
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={overrideLimitUnlimited}
                        onChange={(e) => setOverrideLimitUnlimited(e.target.checked)}
                      />
                      Unlimited
                    </label>
                    <Button
                      size="sm"
                      onClick={() => limitOverrideMutation.mutate(entitlementsTenantId)}
                      isLoading={limitOverrideMutation.isPending}
                    >
                      Apply limit override
                    </Button>
                  </div>
                </div>

                <Button
                  variant="danger"
                  onClick={() => {
                    if (confirm("Reset all overrides to plan defaults?")) {
                      resetEntitlementsMutation.mutate(entitlementsTenantId);
                    }
                  }}
                  isLoading={resetEntitlementsMutation.isPending}
                >
                  Reset to plan defaults
                </Button>
              </>
            )}
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
            <div className="flex flex-wrap gap-2">
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

      <ModalFrame open={showCreateModal} onClose={() => setShowCreateModal(false)}>
          <Card className="w-full border-violet-500/20 bg-[#0f1117]">
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
              <ColorField
                label="Primary color (optional)"
                value={createForm.primary_color || "#FF6B35"}
                onChange={(hex) => setCreateForm((f) => ({ ...f, primary_color: hex }))}
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
      </ModalFrame>

      <ModalFrame
        open={!!purgeTenant}
        onClose={() => {
          if (purgeMutation.isPending) return;
          setPurgeTenant(null);
          setPurgeSlugConfirm("");
        }}
      >
        <Card className="w-full border-danger/30 bg-[#0f1117]">
          <CardHeader>
            <CardTitle>Permanently delete kitchen</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted">
              This permanently deletes{" "}
              <span className="font-semibold text-foreground">{purgeTenant?.name}</span> (
              <span className="font-mono text-xs">{purgeTenant?.slug}</span>) and all related data:
              users, orders, menu, customers, branding, and subscriptions. This cannot be undone.
            </p>
            <Input
              label={`Type slug “${purgeTenant?.slug ?? ""}” to confirm`}
              value={purgeSlugConfirm}
              onChange={(e) => setPurgeSlugConfirm(e.target.value)}
              placeholder={purgeTenant?.slug}
              autoComplete="off"
            />
            <div className="flex flex-wrap gap-2">
              <Button
                variant="danger"
                isLoading={purgeMutation.isPending}
                disabled={
                  !purgeTenant ||
                  purgeSlugConfirm.trim().toLowerCase() !== (purgeTenant?.slug ?? "").toLowerCase()
                }
                onClick={() => purgeMutation.mutate()}
              >
                Delete forever
              </Button>
              <Button
                variant="secondary"
                disabled={purgeMutation.isPending}
                onClick={() => {
                  setPurgeTenant(null);
                  setPurgeSlugConfirm("");
                }}
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      </ModalFrame>
    </BackendPage>
  );
}
