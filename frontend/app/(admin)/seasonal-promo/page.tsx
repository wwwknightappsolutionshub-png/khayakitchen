"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Sparkles } from "lucide-react";
import { BackendPage } from "@/components/shared/BackendPage";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { seasonalPromoService } from "@/services/seasonal-promo.service";
import { menuAdminService } from "@/services/menu-admin.service";
import { ApiClientError } from "@/lib/api-client";
import { useAuth } from "@/hooks/useAuth";

export default function SeasonalPromoPage() {
  const { user } = useAuth();
  const canEdit = user?.role === "owner" || user?.role === "manager";
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    headline: "",
    subheadline: "",
    details: "",
    cta_label: "View on menu",
    meal_id: "",
    is_published: false,
  });
  const [synced, setSynced] = useState(false);

  const promoQuery = useQuery({
    queryKey: ["seasonal-promo"],
    queryFn: () => seasonalPromoService.get(),
    enabled: canEdit,
  });

  const mealsQuery = useQuery({
    queryKey: ["menu", "admin"],
    queryFn: () => menuAdminService.getAdminMenu(),
    enabled: canEdit,
  });

  useEffect(() => {
    const promo = promoQuery.data?.promo;
    if (!promo || synced) return;
    setForm({
      headline: promo.headline ?? "",
      subheadline: promo.subheadline ?? "",
      details: promo.details ?? "",
      cta_label: promo.cta_label || "View on menu",
      meal_id: promo.meal_id ?? "",
      is_published: !!promo.is_published,
    });
    setSynced(true);
  }, [promoQuery.data, synced]);

  const saveMutation = useMutation({
    mutationFn: () =>
      seasonalPromoService.update({
        headline: form.headline || null,
        subheadline: form.subheadline || null,
        details: form.details || null,
        cta_label: form.cta_label || "View on menu",
        meal_id: form.meal_id || null,
        is_published: form.is_published,
      }),
    onSuccess: () => {
      setError(null);
      queryClient.invalidateQueries({ queryKey: ["seasonal-promo"] });
    },
    onError: (err) =>
      setError(err instanceof ApiClientError ? err.message : "Failed to save seasonal promo"),
  });

  const uploadMutation = useMutation({
    mutationFn: (file: File) => seasonalPromoService.uploadImage(file),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["seasonal-promo"] }),
    onError: (err) =>
      setError(err instanceof ApiClientError ? err.message : "Image upload failed"),
  });

  if (!canEdit) {
    return (
      <BackendPage>
        <p className="text-sm text-muted">Only owners and managers can edit Seasonal Promo.</p>
      </BackendPage>
    );
  }

  const meals = mealsQuery.data?.meals ?? [];
  const promo = promoQuery.data?.promo;

  return (
    <BackendPage>
      <header className="backend-header">
        <div className="flex items-center gap-3">
          <Sparkles className="h-7 w-7 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Seasonal Promo</h1>
            <p className="text-sm text-muted">
              Customer splash replaces platform welcome when published
              {promoQuery.data?.free_until
                ? ` · Free until ${promoQuery.data.free_until}`
                : ""}
            </p>
          </div>
        </div>
      </header>

      {error && (
        <p className="mb-4 rounded-[var(--radius)] bg-danger/10 px-3 py-2 text-sm text-danger">
          {error}
        </p>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Promo editor</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="mb-1.5 text-sm font-medium">A · Full-bleed image</p>
            {promo?.image_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={promo.image_url}
                alt=""
                className="mb-2 h-40 w-full max-w-md rounded-xl object-cover"
              />
            )}
            <input
              type="file"
              accept="image/*"
              disabled={uploadMutation.isPending}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) uploadMutation.mutate(file);
              }}
            />
          </div>

          <Input
            label="B · Headline"
            value={form.headline}
            onChange={(e) => setForm((f) => ({ ...f, headline: e.target.value }))}
          />
          <Input
            label="B · Subheadline"
            value={form.subheadline}
            onChange={(e) => setForm((f) => ({ ...f, subheadline: e.target.value }))}
          />

          <div>
            <label className="mb-1.5 block text-sm font-medium">C · More details</label>
            <textarea
              rows={4}
              className="w-full rounded-[var(--radius)] border border-border bg-surface-elevated px-3 py-2 text-sm"
              value={form.details}
              onChange={(e) => setForm((f) => ({ ...f, details: e.target.value }))}
            />
          </div>

          <Input
            label="D · CTA label"
            value={form.cta_label}
            onChange={(e) => setForm((f) => ({ ...f, cta_label: e.target.value }))}
          />

          <div>
            <label className="mb-1.5 block text-sm font-medium">D · Linked menu meal (hash)</label>
            <select
              className="h-10 w-full rounded-[var(--radius)] border border-border bg-surface-elevated px-3 text-sm"
              value={form.meal_id}
              onChange={(e) => setForm((f) => ({ ...f, meal_id: e.target.value }))}
            >
              <option value="">Select meal</option>
              {meals.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
            {form.meal_id && (
              <p className="mt-1 text-xs text-muted">CTA opens /menu#meal-{form.meal_id}</p>
            )}
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.is_published}
              onChange={(e) => setForm((f) => ({ ...f, is_published: e.target.checked }))}
            />
            Publish (show on customer PWA splash)
          </label>

          <Button
            disabled={saveMutation.isPending || promoQuery.isLoading}
            isLoading={saveMutation.isPending}
            onClick={() => saveMutation.mutate()}
          >
            Save Seasonal Promo
          </Button>
        </CardContent>
      </Card>
    </BackendPage>
  );
}
