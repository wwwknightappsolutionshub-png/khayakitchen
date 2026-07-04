"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Layers, Plus, RotateCcw, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { ModalPortal } from "@/components/ui/ModalPortal";
import type { PricingFeature } from "@/lib/types";
import { pricingService } from "@/services/pricing.service";
import { ApiClientError } from "@/lib/api-client";

const CATEGORIES = ["core", "operations", "marketing", "analytics", "integrations"];

function emptyFeature(): Omit<PricingFeature, "id"> {
  return {
    key: "",
    name: "",
    description: "",
    category: "core",
    icon: "",
    module: "",
    status: "active",
    internal_notes: "",
  };
}

export default function PlatformFeaturesPage() {
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<PricingFeature | null>(null);
  const [form, setForm] = useState(emptyFeature());
  const [error, setError] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["platform-features"],
    queryFn: () => pricingService.getFeatures(true),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["platform-features"] });

  const saveMutation = useMutation({
    mutationFn: () =>
      editing?.id
        ? pricingService.updateFeature(editing.id, form)
        : pricingService.createFeature(form),
    onSuccess: () => {
      invalidate();
      queryClient.invalidateQueries({ queryKey: ["platform-features-flat"] });
      setShowModal(false);
      setEditing(null);
    },
    onError: (err) =>
      setError(err instanceof ApiClientError ? err.message : "Failed to save feature"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => pricingService.deleteFeature(id),
    onSuccess: invalidate,
  });

  const restoreMutation = useMutation({
    mutationFn: (id: string) => pricingService.restoreFeature(id),
    onSuccess: invalidate,
  });

  const featuresByCategory = data?.features ?? {};
  const categories = Object.keys(featuresByCategory);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyFeature());
    setError(null);
    setShowModal(true);
  };

  const openEdit = (feature: PricingFeature) => {
    setEditing(feature);
    setForm({
      key: feature.key,
      name: feature.name,
      description: feature.description ?? "",
      category: feature.category,
      icon: feature.icon ?? "",
      module: feature.module ?? "",
      status: feature.status ?? "active",
      internal_notes: feature.internal_notes ?? "",
    });
    setError(null);
    setShowModal(true);
  };

  return (
    <div className="animate-fade-in">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Layers className="h-7 w-7 text-violet-400" />
          <div>
            <h1 className="text-2xl font-bold text-violet-50">Feature Library</h1>
            <p className="text-sm text-violet-200/60">Catalog of billable platform features</p>
          </div>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" />
          Add feature
        </Button>
      </header>

      {isLoading && <p className="text-sm text-muted">Loading features…</p>}

      <div className="space-y-6">
        {categories.map((category) => (
          <Card key={category} className="border-violet-500/20 bg-[#0f1118]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 capitalize text-violet-50">
                <Layers className="h-4 w-4" />
                {category}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-hidden rounded-[var(--radius)] border border-border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-surface-elevated/50 text-left text-muted">
                      <th className="px-4 py-3 font-medium">Name</th>
                      <th className="px-4 py-3 font-medium">Key</th>
                      <th className="px-4 py-3 font-medium">Module</th>
                      <th className="px-4 py-3 font-medium">Status</th>
                      <th className="px-4 py-3 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(featuresByCategory as Record<string, PricingFeature[]>)[category]?.map(
                      (feature) => (
                        <tr key={feature.id ?? feature.key} className="border-b border-border last:border-0">
                          <td className="px-4 py-3 font-medium">{feature.name}</td>
                          <td className="px-4 py-3 font-mono text-muted">{feature.key}</td>
                          <td className="px-4 py-3 text-muted">{feature.module ?? "—"}</td>
                          <td className="px-4 py-3">
                            <Badge variant={feature.status === "active" ? "secondary" : "outline"}>
                              {feature.status ?? "active"}
                            </Badge>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex gap-1">
                              <Button size="sm" variant="secondary" onClick={() => openEdit(feature)}>
                                Edit
                              </Button>
                              {feature.deleted_at || feature.status === "archived" ? (
                                feature.id && (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => restoreMutation.mutate(feature.id!)}
                                  >
                                    <RotateCcw className="h-3.5 w-3.5" />
                                  </Button>
                                )
                              ) : (
                                feature.id && (
                                  <Button
                                    size="sm"
                                    variant="danger"
                                    onClick={() => {
                                      if (confirm(`Archive "${feature.name}"?`)) {
                                        deleteMutation.mutate(feature.id!);
                                      }
                                    }}
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                )
                              )}
                            </div>
                          </td>
                        </tr>
                      ),
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        ))}
        {categories.length === 0 && !isLoading && (
          <p className="text-sm text-muted">No features yet — add your first feature.</p>
        )}
      </div>

      <ModalPortal open={showModal} onClose={() => setShowModal(false)}>
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
          <button
            type="button"
            className="absolute inset-0 bg-black/70"
            onClick={() => setShowModal(false)}
            aria-label="Close"
          />
          <Card className="relative z-10 w-full max-w-lg border-violet-500/20 bg-[#0f1117]">
            <CardHeader>
              <CardTitle>{editing ? "Edit feature" : "Create feature"}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {error && (
                <p className="rounded-[var(--radius)] bg-danger/10 px-3 py-2 text-sm text-danger">
                  {error}
                </p>
              )}
              <Input
                label="Name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
              <Input
                label="Key / slug"
                value={form.key}
                disabled={!!editing}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    key: e.target.value.toLowerCase().replace(/[^a-z0-9._-]/g, ""),
                  }))
                }
              />
              <Input
                label="Description"
                value={form.description ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium">Category</label>
                  <select
                    className="h-10 w-full rounded-[var(--radius)] border border-border bg-surface-elevated px-3 text-sm"
                    value={form.category}
                    onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <Input
                  label="Module"
                  value={form.module ?? ""}
                  onChange={(e) => setForm((f) => ({ ...f, module: e.target.value }))}
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Input
                  label="Icon"
                  value={form.icon ?? ""}
                  onChange={(e) => setForm((f) => ({ ...f, icon: e.target.value }))}
                  placeholder="utensils"
                />
                <div>
                  <label className="mb-1.5 block text-sm font-medium">Status</label>
                  <select
                    className="h-10 w-full rounded-[var(--radius)] border border-border bg-surface-elevated px-3 text-sm"
                    value={form.status ?? "active"}
                    onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
                  >
                    <option value="active">Active</option>
                    <option value="beta">Beta</option>
                    <option value="deprecated">Deprecated</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium">Internal notes</label>
                <textarea
                  rows={3}
                  value={form.internal_notes ?? ""}
                  onChange={(e) => setForm((f) => ({ ...f, internal_notes: e.target.value }))}
                  className="w-full rounded-[var(--radius)] border border-border bg-surface-elevated px-3 py-2 text-sm"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => saveMutation.mutate()}
                  isLoading={saveMutation.isPending}
                  disabled={!form.name.trim() || !form.key.trim()}
                >
                  {editing ? "Save" : "Create"}
                </Button>
                <Button variant="secondary" onClick={() => setShowModal(false)}>
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
