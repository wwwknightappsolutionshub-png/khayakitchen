"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
import { Palette, Store } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { ColorField } from "@/components/ui/ColorField";
import { Badge } from "@/components/ui/Badge";
import { BackendPage } from "@/components/shared/BackendPage";
import { LiveDashboardStatusControl } from "@/components/admin/LiveDashboardStatusControl";
import { tenantBrandingService } from "@/services/tenant-branding.service";
import { useAuthStore } from "@/stores/auth-store";
import type { RestaurantOperationalStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

const STATUS_OPTIONS: {
  value: RestaurantOperationalStatus;
  label: string;
  emoji: string;
  description: string;
}[] = [
  { value: "open", label: "Open", emoji: "🟢", description: "Orders allowed, normal UI" },
  { value: "closing_soon", label: "Closing Soon", emoji: "🟠", description: "Orders allowed, urgency banner" },
  { value: "closed", label: "Closed", emoji: "🔴", description: "Orders disabled, checkout blocked" },
  { value: "promo_mode", label: "Promo Mode", emoji: "🔥", description: "Discount banner, optional promo alerts" },
];

export default function BrandingPage() {
  const queryClient = useQueryClient();
  const role = useAuthStore((s) => s.user?.role);
  const canManage = role === "owner" || role === "super_admin";

  const { data: brandingData, isLoading: brandingLoading } = useQuery({
    queryKey: ["branding"],
    queryFn: () => tenantBrandingService.getBranding(),
  });

  const { data: statusData, isLoading: statusLoading } = useQuery({
    queryKey: ["restaurant-status"],
    queryFn: () => tenantBrandingService.getRestaurantStatus(),
  });

  const branding = brandingData?.branding;
  const status = statusData?.status;
  const [logoUploadProgress, setLogoUploadProgress] = useState<string | null>(null);
  const [bannerUploadProgress, setBannerUploadProgress] = useState<string | null>(null);
  const [logoUploading, setLogoUploading] = useState(false);
  const [bannerUploading, setBannerUploading] = useState(false);

  const brandingMutation = useMutation({
    mutationFn: tenantBrandingService.updateBranding,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["branding"] });
      queryClient.invalidateQueries({ queryKey: ["storefront"] });
    },
  });

  const statusMutation = useMutation({
    mutationFn: tenantBrandingService.updateRestaurantStatus,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["restaurant-status"] });
      queryClient.invalidateQueries({ queryKey: ["storefront"] });
    },
  });

  const isLoading = brandingLoading || statusLoading;

  const handleLogoUpload = async (file: File) => {
    setLogoUploading(true);
    setLogoUploadProgress("Uploading…");
    try {
      await tenantBrandingService.uploadLogo(file);
      setLogoUploadProgress("Upload complete");
      queryClient.invalidateQueries({ queryKey: ["branding"] });
      queryClient.invalidateQueries({ queryKey: ["storefront"] });
    } catch {
      setLogoUploadProgress("Upload failed — try again");
    } finally {
      setLogoUploading(false);
      setTimeout(() => setLogoUploadProgress(null), 3000);
    }
  };

  const handleBannerUpload = async (file: File) => {
    setBannerUploading(true);
    setBannerUploadProgress("Uploading…");
    try {
      await tenantBrandingService.uploadBanner(file);
      setBannerUploadProgress("Upload complete");
      queryClient.invalidateQueries({ queryKey: ["branding"] });
      queryClient.invalidateQueries({ queryKey: ["storefront"] });
    } catch {
      setBannerUploadProgress("Upload failed — try again");
    } finally {
      setBannerUploading(false);
      setTimeout(() => setBannerUploadProgress(null), 3000);
    }
  };

  return (
    <BackendPage>
      <header className="backend-header items-start">
        <div className="flex items-center gap-3">
          <Store className="h-7 w-7 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Restaurant Status & Branding</h1>
            <p className="text-sm text-muted">Control how customers see your storefront</p>
          </div>
        </div>
        <div className="backend-header-actions">
          <Link href="/menu" target="_blank">
            <Button variant="secondary">Preview menu page</Button>
          </Link>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Restaurant Status Control Panel</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoading ? (
              <p className="text-sm text-muted">Loading status…</p>
            ) : (
              <>
                <LiveDashboardStatusControl
                  currentStatus={status?.status}
                  isAcceptingOrders={status?.is_accepting_orders}
                  closingAt={status?.closing_at}
                  promoEndsAt={status?.promo_ends_at}
                  promoMeals={status?.promo_meals}
                  disabled={!canManage}
                  showDescriptions
                />

                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="text-muted">Accepting orders:</span>
                  <Badge variant={status?.is_accepting_orders ? "secondary" : "warning"}>
                    {status?.is_accepting_orders ? "Yes" : "No"}
                  </Badge>
                </div>

                {canManage && (
                  <label className="flex cursor-pointer items-start gap-3 rounded-[var(--radius)] border border-border p-4">
                    <input
                      type="checkbox"
                      className="mt-0.5 accent-primary"
                      checked={status?.promo_alerts_enabled ?? true}
                      disabled={statusMutation.isPending}
                      onChange={(e) =>
                        statusMutation.mutate({
                          status: status?.status ?? "open",
                          promo_alerts_enabled: e.target.checked,
                        })
                      }
                    />
                    <div>
                      <p className="text-sm font-medium">Promo alert notifications</p>
                      <p className="mt-0.5 text-xs text-muted">
                        When promo mode is activated, notify opted-in customers only (max once per 6 hours)
                      </p>
                    </div>
                  </label>
                )}
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Palette className="h-5 w-5 text-primary" />
              <CardTitle>Branding Editor</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading || !branding ? (
              <p className="text-sm text-muted">Loading branding…</p>
            ) : (
              <form
                className="space-y-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!canManage) return;
                  const formData = new FormData(e.currentTarget);
                  brandingMutation.mutate({
                    restaurant_name: String(formData.get("restaurant_name") ?? ""),
                    primary_color: String(formData.get("primary_color") ?? "") || null,
                    secondary_color: String(formData.get("secondary_color") ?? "") || null,
                    ticker_enabled: formData.get("ticker_enabled") === "on",
                    ticker_text: String(formData.get("ticker_text") ?? "") || null,
                  });
                }}
              >
                <Input
                  name="restaurant_name"
                  label="Restaurant name"
                  defaultValue={branding.restaurant_name}
                  disabled={!canManage}
                />
                <div>
                  <label className="mb-1.5 block text-sm font-medium">Logo</label>
                  {branding.logo_url && (
                    <img
                      src={branding.logo_url}
                      alt="Logo preview"
                      className="mb-2 h-16 w-16 rounded-lg border border-border object-cover"
                    />
                  )}
                  {canManage && (
                    <>
                      <input
                        type="file"
                        accept="image/*"
                        disabled={logoUploading}
                        className="block w-full text-sm text-muted file:mr-3 file:rounded-[var(--radius)] file:border-0 file:bg-primary file:px-3 file:py-2 file:text-sm file:font-medium file:text-white"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) void handleLogoUpload(file);
                          e.target.value = "";
                        }}
                      />
                      {logoUploadProgress && (
                        <p className="mt-1 text-xs text-muted">{logoUploadProgress}</p>
                      )}
                    </>
                  )}
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <ColorField
                    name="primary_color"
                    label="Primary color"
                    defaultValue={branding.primary_color ?? "#E07A5F"}
                    disabled={!canManage}
                  />
                  <ColorField
                    name="secondary_color"
                    label="Secondary color"
                    defaultValue={branding.secondary_color ?? "#81B29A"}
                    disabled={!canManage}
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium">Banner image</label>
                  {branding.banner_image && (
                    <img
                      src={branding.banner_image}
                      alt="Banner preview"
                      className="mb-2 h-24 w-full rounded-lg border border-border object-cover"
                    />
                  )}
                  {canManage && (
                    <>
                      <input
                        type="file"
                        accept="image/*"
                        disabled={bannerUploading}
                        className="block w-full text-sm text-muted file:mr-3 file:rounded-[var(--radius)] file:border-0 file:bg-primary file:px-3 file:py-2 file:text-sm file:font-medium file:text-white"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) void handleBannerUpload(file);
                          e.target.value = "";
                        }}
                      />
                      {bannerUploadProgress && (
                        <p className="mt-1 text-xs text-muted">{bannerUploadProgress}</p>
                      )}
                    </>
                  )}
                </div>

                <div className="rounded-[var(--radius)] border border-border p-4">
                  <p className="text-sm font-medium">Header news ticker</p>
                  <p className="mt-1 text-xs text-muted">
                    Shown below your restaurant name on the customer app. Separate messages with | .
                  </p>
                  <label className="mt-3 flex cursor-pointer items-start gap-3">
                    <input
                      type="checkbox"
                      name="ticker_enabled"
                      defaultChecked={branding.ticker_enabled ?? true}
                      disabled={!canManage}
                      className="mt-0.5 accent-primary"
                    />
                    <span className="text-sm">Show news ticker</span>
                  </label>
                  <textarea
                    name="ticker_text"
                    rows={3}
                    defaultValue={branding.ticker_text ?? ""}
                    disabled={!canManage}
                    placeholder="Welcome message | Place your order now | Special offers"
                    className="mt-3 w-full rounded-[var(--radius)] border border-border bg-surface-elevated px-3 py-2 text-sm"
                  />
                </div>

                {canManage && (
                  <Button type="submit" isLoading={brandingMutation.isPending}>
                    Save branding
                  </Button>
                )}
              </form>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-lg">Live preview</CardTitle>
        </CardHeader>
        <CardContent>
          <div
            className="overflow-hidden rounded-[var(--radius)] border border-border"
            style={{
              ["--primary" as string]: branding?.primary_color ?? "#E07A5F",
              ["--secondary" as string]: branding?.secondary_color ?? "#81B29A",
            }}
          >
            <div className="border-b bg-surface-elevated px-4 py-3">
              <p className="text-xs uppercase tracking-wide text-muted">
                {branding?.restaurant_name ?? "Restaurant"}
              </p>
              <p className="font-semibold">Customer menu preview</p>
            </div>
            <div
              className={cn(
                "px-4 py-2 text-center text-sm",
                status?.status === "open" && "bg-emerald-500/10 text-emerald-400",
                status?.status === "closing_soon" && "bg-amber-500/10 text-amber-400",
                status?.status === "closed" && "bg-red-500/10 text-red-400",
                status?.status === "promo_mode" && "bg-primary/10 text-primary",
              )}
            >
              {STATUS_OPTIONS.find((o) => o.value === status?.status)?.emoji}{" "}
              {STATUS_OPTIONS.find((o) => o.value === status?.status)?.label ?? "Open"}
            </div>
            <div className="bg-surface p-4 text-sm text-muted">
              Menu items appear here for customers. Open the full preview to see your live PWA.
            </div>
          </div>
        </CardContent>
      </Card>
    </BackendPage>
  );
}
