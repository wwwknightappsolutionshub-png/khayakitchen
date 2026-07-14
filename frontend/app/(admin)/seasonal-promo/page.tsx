"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Eye, Sparkles } from "lucide-react";
import { BackendPage } from "@/components/shared/BackendPage";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { ModalFrame } from "@/components/ui/ModalFrame";
import { seasonalPromoService } from "@/services/seasonal-promo.service";
import { menuAdminService } from "@/services/menu-admin.service";
import { ApiClientError } from "@/lib/api-client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/providers/ToastProvider";
import { cn } from "@/lib/utils";

export default function SeasonalPromoPage() {
  const { user } = useAuth();
  const canEdit = user?.role === "owner" || user?.role === "manager";
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [error, setError] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
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
    onSuccess: (data) => {
      setError(null);
      setForm((f) => ({ ...f, is_published: !!data.promo.is_published }));
      queryClient.invalidateQueries({ queryKey: ["seasonal-promo"] });
      showToast(
        "Seasonal promo saved",
        data.promo.is_published
          ? "Live on the customer splash until you turn it off."
          : "Draft saved. Turn the toggle on to show it to customers.",
      );
    },
    onError: (err) =>
      setError(err instanceof ApiClientError ? err.message : "Failed to save seasonal promo"),
  });

  const toggleMutation = useMutation({
    mutationFn: (is_published: boolean) =>
      seasonalPromoService.update({
        headline: form.headline || null,
        subheadline: form.subheadline || null,
        details: form.details || null,
        cta_label: form.cta_label || "View on menu",
        meal_id: form.meal_id || null,
        is_published,
      }),
    onSuccess: (data) => {
      setError(null);
      setForm((f) => ({ ...f, is_published: !!data.promo.is_published }));
      queryClient.invalidateQueries({ queryKey: ["seasonal-promo"] });
      showToast(
        data.promo.is_published ? "Seasonal promo is on" : "Seasonal promo is off",
        data.promo.is_published
          ? "Customers will see this splash instead of the platform welcome."
          : "Customers will see the normal platform welcome splash.",
      );
    },
    onError: (err) => {
      setError(
        err instanceof ApiClientError
          ? err.message
          : "Could not update seasonal promo status",
      );
    },
  });

  const uploadMutation = useMutation({
    mutationFn: (file: File) => seasonalPromoService.uploadImage(file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["seasonal-promo"] });
      showToast("Image uploaded", "Your seasonal promo image was updated.");
    },
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
  const previewImage = promo?.image_url ?? null;
  const toggleBusy = toggleMutation.isPending || saveMutation.isPending;

  const handleToggle = () => {
    const next = !form.is_published;
    if (next && (!form.headline.trim() || !form.meal_id)) {
      setError("Add a headline and link a menu meal before turning Seasonal Promo on.");
      return;
    }
    setForm((f) => ({ ...f, is_published: next }));
    toggleMutation.mutate(next);
  };

  return (
    <BackendPage>
      <header className="backend-header">
        <div className="flex flex-wrap items-start justify-between gap-4">
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

          <div className="flex items-center gap-3 rounded-[var(--radius)] border border-border bg-surface-elevated px-3 py-2">
            <div className="text-right">
              <p className="text-sm font-medium">Seasonal Promo</p>
              <p className="text-xs text-muted">{form.is_published ? "On · live" : "Off"}</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={form.is_published}
              disabled={toggleBusy || promoQuery.isLoading}
              onClick={handleToggle}
              className={cn(
                "relative h-7 w-12 shrink-0 rounded-full transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
                "disabled:opacity-50",
                form.is_published ? "bg-primary" : "bg-border",
              )}
            >
              <span
                className={cn(
                  "absolute top-0.5 left-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform",
                  form.is_published && "translate-x-5",
                )}
              />
            </button>
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

          <div className="flex flex-wrap gap-3 pt-2">
            <Button
              disabled={saveMutation.isPending || promoQuery.isLoading}
              isLoading={saveMutation.isPending}
              onClick={() => saveMutation.mutate()}
            >
              Save Seasonal Promo
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={promoQuery.isLoading}
              onClick={() => setPreviewOpen(true)}
            >
              <Eye className="h-4 w-4" />
              Preview
            </Button>
          </div>
        </CardContent>
      </Card>

      <ModalFrame
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        maxWidth="sm:max-w-md"
        panelClassName="bg-[#F4F1DE] text-[#004D40]"
      >
        <div className="flex flex-col">
          {previewImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={previewImage} alt="" className="h-48 w-full object-cover sm:h-56" />
          ) : (
            <div className="flex h-36 items-center justify-center bg-black/5 text-sm opacity-70">
              Seasonal offer · add an image
            </div>
          )}
          <div className="flex flex-col px-6 py-6 text-center">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] opacity-60">
              Preview · not live
            </p>
            <h2 className="text-2xl font-bold">
              {form.headline.trim() || "Your headline goes here"}
            </h2>
            {(form.subheadline.trim() || !form.headline.trim()) && (
              <p className="mt-2 text-base opacity-85">
                {form.subheadline.trim() || "Optional subheadline"}
              </p>
            )}
            {form.details.trim() && (
              <p className="mt-4 text-sm leading-relaxed opacity-80">{form.details.trim()}</p>
            )}
            <div className="mt-8 flex flex-col gap-3">
              <button
                type="button"
                className="h-11 w-full rounded-[var(--radius)] bg-[#004D40] text-sm font-medium text-white"
              >
                {form.cta_label.trim() || "View on menu"}
              </button>
              <button
                type="button"
                className="h-11 w-full rounded-[var(--radius)] border border-[#004D40]/30 text-sm font-medium"
                onClick={() => setPreviewOpen(false)}
              >
                Close preview
              </button>
            </div>
            {form.meal_id && (
              <p className="mt-3 text-xs opacity-60">CTA target: /menu#meal-{form.meal_id}</p>
            )}
          </div>
        </div>
      </ModalFrame>
    </BackendPage>
  );
}
