"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Archive,
  ArrowDown,
  ArrowUp,
  Copy,
  CreditCard,
  Eye,
  EyeOff,
  Pencil,
  Plus,
  RotateCcw,
  Star,
  Trash2,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { ModalFrame } from "@/components/ui/ModalFrame";
import {
  PLAN_LIMIT_KEYS,
  type PlanLimitKey,
  type PricingFeature,
  type PricingPlan,
  type UnlimitedFlags,
} from "@/lib/types";
import { formatCurrency } from "@/lib/utils";
import { pricingService } from "@/services/pricing.service";
import { ApiClientError } from "@/lib/api-client";
import { BackendPage } from "@/components/shared/BackendPage";

type PlanTab = "details" | "limits" | "marketing" | "features";

const LIMIT_LABELS: Record<PlanLimitKey, string> = {
  max_menu_items: "Menu items",
  max_categories: "Categories",
  max_staff: "Staff accounts",
  max_campaigns_per_month: "Campaigns / month",
  max_push_notifications_per_month: "Push notifications / month",
  max_storage_mb: "Storage (MB)",
  max_images: "Images",
  max_branches: "Branches",
  max_drivers: "Drivers",
  max_customers: "Customers",
  max_products: "Products",
  max_loyalty_members: "Loyalty members",
  max_active_promotions: "Active promotions",
  max_delivery_zones: "Delivery zones",
  max_orders_per_day: "Orders / day",
};

function defaultPlanForm(): Partial<PricingPlan> {
  return {
    name: "",
    slug: "",
    description: "",
    price_monthly: 0,
    price_yearly: 0,
    currency: "GBP",
    cta_text: "Get started",
    plan_color: "#8B5CF6",
    plan_icon: "sparkles",
    is_active: true,
    is_visible: true,
    is_recommended: false,
    marketing_features: [],
    max_menu_items: 50,
    max_orders_per_day: 500,
    max_customers: 1000,
    max_categories: 10,
    max_staff: 5,
    max_campaigns_per_month: 10,
    max_push_notifications_per_month: 1000,
    max_storage_mb: 500,
    max_images: 50,
    max_branches: 1,
    max_drivers: 5,
    max_products: 50,
    max_loyalty_members: 500,
    max_active_promotions: 3,
    max_delivery_zones: 5,
    unlimited_flags: {},
  };
}

function planToForm(plan: PricingPlan): Partial<PricingPlan> {
  return {
    ...plan,
    marketing_features: plan.marketing_features ?? [],
    unlimited_flags: plan.unlimited_flags ?? {},
  };
}

export default function PlatformPricingPage() {
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState<PricingPlan | null>(null);
  const [form, setForm] = useState<Partial<PricingPlan>>(defaultPlanForm());
  const [tab, setTab] = useState<PlanTab>("details");
  const [marketingLine, setMarketingLine] = useState("");
  const [featureMap, setFeatureMap] = useState<Record<string, boolean>>({});
  const [formError, setFormError] = useState<string | null>(null);

  const plansQuery = useQuery({
    queryKey: ["platform-plans"],
    queryFn: () => pricingService.getPlatformPlans(),
  });
  const featuresQuery = useQuery({
    queryKey: ["platform-features-flat"],
    queryFn: () => pricingService.getFeatures(false),
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["platform-plans"] });
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = { ...form };
      if (editingPlan) {
        const { plan } = await pricingService.updatePlan(editingPlan.id, payload);
        await pricingService.syncPlanFeatures(editingPlan.id, featureMap);
        return plan;
      }
      const { plan } = await pricingService.createPlan(payload);
      if (Object.keys(featureMap).length > 0) {
        await pricingService.syncPlanFeatures(plan.id, featureMap);
      }
      return plan;
    },
    onSuccess: () => {
      invalidate();
      closeModal();
    },
    onError: (err) => {
      setFormError(err instanceof ApiClientError ? err.message : "Failed to save plan");
    },
  });

  const archiveMutation = useMutation({
    mutationFn: (id: string) => pricingService.archivePlan(id),
    onSuccess: invalidate,
  });

  const restoreMutation = useMutation({
    mutationFn: (id: string) => pricingService.restorePlan(id),
    onSuccess: invalidate,
  });

  const duplicateMutation = useMutation({
    mutationFn: (id: string) => pricingService.duplicatePlan(id),
    onSuccess: invalidate,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => pricingService.deletePlan(id),
    onSuccess: invalidate,
  });

  const activeMutation = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) =>
      pricingService.setPlanActive(id, active),
    onSuccess: invalidate,
  });

  const visibilityMutation = useMutation({
    mutationFn: ({ id, visible }: { id: string; visible: boolean }) =>
      pricingService.setPlanVisibility(id, visible),
    onSuccess: invalidate,
  });

  const reorderMutation = useMutation({
    mutationFn: (order: string[]) => pricingService.reorderPlans(order),
    onSuccess: invalidate,
  });

  const allFeatures = useMemo(() => {
    const raw = featuresQuery.data?.features;
    if (!raw) return [] as PricingFeature[];
    if (Array.isArray(raw)) return raw;
    return Object.values(raw).flat();
  }, [featuresQuery.data]);

  const plans = [...(plansQuery.data?.plans ?? [])].sort(
    (a, b) => (a.display_order ?? 0) - (b.display_order ?? 0),
  );

  const openCreate = () => {
    setEditingPlan(null);
    setForm(defaultPlanForm());
    setFeatureMap(
      Object.fromEntries(allFeatures.filter((f) => f.id).map((f) => [f.id!, false])),
    );
    setTab("details");
    setFormError(null);
    setShowModal(true);
  };

  const openEdit = (plan: PricingPlan) => {
    setEditingPlan(plan);
    setForm(planToForm(plan));
    const map: Record<string, boolean> = {};
    allFeatures.forEach((f) => {
      if (!f.id) return;
      const assigned = plan.features?.find((pf) => pf.id === f.id || pf.key === f.key);
      map[f.id] = assigned?.pivot?.enabled ?? false;
    });
    setFeatureMap(map);
    setTab("details");
    setFormError(null);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingPlan(null);
    setMarketingLine("");
    setFormError(null);
  };

  const movePlan = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= plans.length) return;
    const order = plans.map((p) => p.id);
    [order[index], order[target]] = [order[target], order[index]];
    reorderMutation.mutate(order);
  };

  const toggleUnlimited = (key: PlanLimitKey) => {
    setForm((f) => {
      const flags: UnlimitedFlags = { ...(f.unlimited_flags ?? {}) };
      flags[key] = !flags[key];
      return { ...f, unlimited_flags: flags };
    });
  };

  const addMarketingFeature = () => {
    const line = marketingLine.trim();
    if (!line) return;
    setForm((f) => ({
      ...f,
      marketing_features: [...(f.marketing_features ?? []), line],
    }));
    setMarketingLine("");
  };

  return (
    <BackendPage>
      <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <CreditCard className="h-7 w-7 text-violet-400" />
          <div>
            <h1 className="text-2xl font-bold text-violet-50">Plans & Pricing</h1>
            <p className="text-sm text-violet-200/60">Create and manage subscription plans</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <a
            href="/pricing"
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-10 items-center justify-center gap-2 rounded-[var(--radius)] border border-border bg-surface-elevated px-4 text-sm font-medium text-foreground transition-colors hover:bg-surface"
          >
            View public page
          </a>
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" />
            Create plan
          </Button>
        </div>
      </header>

      {plansQuery.isLoading && <p className="text-sm text-muted">Loading plans…</p>}

      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
        {plans.map((plan, index) => {
          const archived = !!plan.deleted_at;
          return (
            <Card
              key={plan.id}
              className={`border-violet-500/20 bg-[#0f1118] ${archived ? "opacity-60" : ""}`}
              style={{ borderTopColor: plan.plan_color ?? undefined, borderTopWidth: plan.plan_color ? 3 : undefined }}
            >
              <CardHeader className="flex flex-row items-start justify-between gap-2 pb-2">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <CardTitle className="text-violet-50">{plan.name}</CardTitle>
                    {plan.is_recommended && (
                      <Badge variant="warning">
                        <Star className="mr-1 h-3 w-3" />
                        Recommended
                      </Badge>
                    )}
                    {archived && <Badge variant="outline">Archived</Badge>}
                  </div>
                  <p className="mt-1 font-mono text-sm text-violet-200">
                    {formatCurrency(plan.price_monthly, "GBP")}/mo · {formatCurrency(plan.price_yearly, "GBP")}/yr
                  </p>
                  {plan.slug && (
                    <p className="text-xs text-violet-300/50">{plan.slug}</p>
                  )}
                </div>
                <div className="flex flex-col gap-1">
                  <button
                    type="button"
                    disabled={index === 0 || reorderMutation.isPending}
                    onClick={() => movePlan(index, -1)}
                    className="rounded p-1 text-violet-300/50 hover:bg-violet-500/10 hover:text-violet-100 disabled:opacity-30"
                    aria-label="Move up"
                  >
                    <ArrowUp className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    disabled={index === plans.length - 1 || reorderMutation.isPending}
                    onClick={() => movePlan(index, 1)}
                    className="rounded p-1 text-violet-300/50 hover:bg-violet-500/10 hover:text-violet-100 disabled:opacity-30"
                    aria-label="Move down"
                  >
                    <ArrowDown className="h-4 w-4" />
                  </button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {plan.description && (
                  <p className="line-clamp-2 text-violet-200/60">{plan.description}</p>
                )}
                <div className="flex flex-wrap gap-1">
                  {plan.is_active ? (
                    <Badge variant="secondary">Active</Badge>
                  ) : (
                    <Badge variant="outline">Inactive</Badge>
                  )}
                  {plan.is_visible ? (
                    <Badge variant="outline">Public</Badge>
                  ) : (
                    <Badge variant="outline">Hidden</Badge>
                  )}
                </div>
                <p className="text-violet-200/70">
                  {plan.max_menu_items} meals · {plan.max_orders_per_day} orders/day ·{" "}
                  {plan.max_customers} customers
                </p>
                <div className="flex flex-wrap gap-1">
                  <Button size="sm" variant="secondary" onClick={() => openEdit(plan)}>
                    <Pencil className="h-3.5 w-3.5" />
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => duplicateMutation.mutate(plan.id)}
                    isLoading={duplicateMutation.isPending}
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() =>
                      activeMutation.mutate({ id: plan.id, active: !plan.is_active })
                    }
                  >
                    {plan.is_active ? "Deactivate" : "Activate"}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() =>
                      visibilityMutation.mutate({ id: plan.id, visible: !plan.is_visible })
                    }
                  >
                    {plan.is_visible ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </Button>
                  {archived ? (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => restoreMutation.mutate(plan.id)}
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => archiveMutation.mutate(plan.id)}
                    >
                      <Archive className="h-3.5 w-3.5" />
                    </Button>
                  )}
                  {!archived && (
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => {
                        if (confirm(`Permanently delete "${plan.name}"?`)) {
                          deleteMutation.mutate(plan.id);
                        }
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <ModalFrame open={showModal} onClose={closeModal} maxWidth="sm:max-w-2xl">
          <Card className="flex w-full flex-col border-violet-500/20 bg-[#0f1117]">
            <CardHeader className="shrink-0 border-b border-violet-500/10">
              <CardTitle>{editingPlan ? `Edit ${editingPlan.name}` : "Create plan"}</CardTitle>
              <div className="mt-3 flex flex-wrap gap-2">
                {(["details", "limits", "marketing", "features"] as PlanTab[]).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTab(t)}
                    className={`rounded-lg px-3 py-1.5 text-sm capitalize ${
                      tab === t
                        ? "bg-violet-600/30 text-violet-100"
                        : "text-violet-200/50 hover:text-violet-100"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </CardHeader>
            <CardContent className="min-h-0 flex-1 overflow-y-auto space-y-4 pt-4">
              {formError && (
                <p className="rounded-[var(--radius)] bg-danger/10 px-3 py-2 text-sm text-danger">
                  {formError}
                </p>
              )}

              {tab === "details" && (
                <>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Input
                      label="Name"
                      value={form.name ?? ""}
                      onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    />
                    <Input
                      label="Slug"
                      value={form.slug ?? ""}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""),
                        }))
                      }
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium">Description</label>
                    <textarea
                      rows={3}
                      value={form.description ?? ""}
                      onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                      className="w-full rounded-[var(--radius)] border border-border bg-surface-elevated px-3 py-2 text-sm"
                    />
                  </div>
                  <div className="grid gap-4 sm:grid-cols-3">
                    <Input
                      label="Monthly price"
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.price_monthly ?? 0}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, price_monthly: Number(e.target.value) }))
                      }
                    />
                    <Input
                      label="Yearly price"
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.price_yearly ?? 0}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, price_yearly: Number(e.target.value) }))
                      }
                    />
                    <Input
                      label="Currency"
                      value={form.currency ?? "GBP"}
                      onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value }))}
                    />
                  </div>
                  <div className="grid gap-4 sm:grid-cols-3">
                    <Input
                      label="CTA text"
                      value={form.cta_text ?? ""}
                      onChange={(e) => setForm((f) => ({ ...f, cta_text: e.target.value }))}
                    />
                    <Input
                      label="Plan color"
                      type="color"
                      value={form.plan_color ?? "#8B5CF6"}
                      onChange={(e) => setForm((f) => ({ ...f, plan_color: e.target.value }))}
                    />
                    <Input
                      label="Plan icon"
                      value={form.plan_icon ?? ""}
                      onChange={(e) => setForm((f) => ({ ...f, plan_icon: e.target.value }))}
                      placeholder="sparkles"
                    />
                  </div>
                  <div className="flex flex-wrap gap-4">
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={form.is_active ?? true}
                        onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
                      />
                      Active
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={form.is_visible ?? true}
                        onChange={(e) => setForm((f) => ({ ...f, is_visible: e.target.checked }))}
                      />
                      Visible on public page
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={form.is_recommended ?? false}
                        onChange={(e) =>
                          setForm((f) => ({ ...f, is_recommended: e.target.checked }))
                        }
                      />
                      Recommended plan
                    </label>
                  </div>
                </>
              )}

              {tab === "limits" && (
                <div className="grid gap-3 sm:grid-cols-2">
                  {PLAN_LIMIT_KEYS.map((key) => {
                    const unlimited = form.unlimited_flags?.[key] ?? false;
                    return (
                      <div
                        key={key}
                        className="rounded-[var(--radius)] border border-border p-3"
                      >
                        <div className="mb-2 flex items-center justify-between gap-2">
                          <span className="text-sm font-medium">{LIMIT_LABELS[key]}</span>
                          <label className="flex items-center gap-1.5 text-xs text-muted">
                            <input
                              type="checkbox"
                              checked={unlimited}
                              onChange={() => toggleUnlimited(key)}
                            />
                            Unlimited
                          </label>
                        </div>
                        <Input
                          type="number"
                          min="0"
                          disabled={unlimited}
                          value={String((form as Record<string, unknown>)[key] ?? 0)}
                          onChange={(e) =>
                            setForm((f) => ({ ...f, [key]: Number(e.target.value) }))
                          }
                        />
                      </div>
                    );
                  })}
                </div>
              )}

              {tab === "marketing" && (
                <>
                  <div className="flex gap-2">
                    <Input
                      label="Marketing bullet"
                      value={marketingLine}
                      onChange={(e) => setMarketingLine(e.target.value)}
                      placeholder="Unlimited orders during peak hours"
                      className="flex-1"
                    />
                    <Button className="mt-6" type="button" onClick={addMarketingFeature}>
                      Add
                    </Button>
                  </div>
                  <ul className="space-y-2">
                    {(form.marketing_features ?? []).map((line, i) => (
                      <li
                        key={line}
                        className="flex items-center justify-between rounded-[var(--radius)] border border-border px-3 py-2 text-sm"
                      >
                        {line}
                        <button
                          type="button"
                          className="text-danger hover:underline"
                          onClick={() =>
                            setForm((f) => ({
                              ...f,
                              marketing_features: (f.marketing_features ?? []).filter(
                                (_, idx) => idx !== i,
                              ),
                            }))
                          }
                        >
                          Remove
                        </button>
                      </li>
                    ))}
                  </ul>
                </>
              )}

              {tab === "features" && (
                <div className="space-y-2">
                  {allFeatures.length === 0 && (
                    <p className="text-sm text-muted">No features in catalog yet.</p>
                  )}
                  {allFeatures.map((feature) => {
                    if (!feature.id) return null;
                    return (
                      <label
                        key={feature.id}
                        className="flex cursor-pointer items-center gap-3 rounded-[var(--radius)] border border-border px-3 py-2 text-sm hover:bg-surface-elevated/50"
                      >
                        <input
                          type="checkbox"
                          checked={featureMap[feature.id] ?? false}
                          onChange={(e) =>
                            setFeatureMap((m) => ({ ...m, [feature.id!]: e.target.checked }))
                          }
                        />
                        <span className="font-medium">{feature.name}</span>
                        <span className="text-muted">({feature.key})</span>
                        <Badge variant="outline" className="ml-auto capitalize">
                          {feature.category}
                        </Badge>
                      </label>
                    );
                  })}
                </div>
              )}
            </CardContent>
            <div className="flex shrink-0 gap-2 border-t border-violet-500/10 p-4">
              <Button
                onClick={() => saveMutation.mutate()}
                isLoading={saveMutation.isPending}
                disabled={!form.name?.trim()}
              >
                {editingPlan ? "Save changes" : "Create plan"}
              </Button>
              <Button variant="secondary" onClick={closeModal}>
                Cancel
              </Button>
            </div>
          </Card>
      </ModalFrame>
    </BackendPage>
  );
}
