"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ModalFrame } from "@/components/ui/ModalFrame";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { menuAdminService } from "@/services/menu-admin.service";
import type { CreateRevenueRecoveryCampaignPayload } from "@/services/revenue-recovery.service";
import type { RevenueRecoveryCampaign } from "@/lib/types";
import { getCampaignTypePreset } from "@/lib/revenue-recovery-presets";
import { cn, formatCurrency, toNumber } from "@/lib/utils";

function minDateTimeLocal(): string {
  const date = new Date();
  date.setMinutes(date.getMinutes() + 5);
  date.setSeconds(0, 0);
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60 * 1000);
  return local.toISOString().slice(0, 16);
}

function defaultEnd(start: string, hours = 2): string {
  const date = new Date(start);
  date.setHours(date.getHours() + hours);
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60 * 1000);
  return local.toISOString().slice(0, 16);
}

function toLocalInput(iso?: string): string {
  if (!iso) return minDateTimeLocal();
  const date = new Date(iso);
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60 * 1000);
  return local.toISOString().slice(0, 16);
}

interface RevenueRecoveryCampaignFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (payload: CreateRevenueRecoveryCampaignPayload) => void;
  isLoading?: boolean;
  initial?: RevenueRecoveryCampaign | null;
}

export function RevenueRecoveryCampaignForm({
  open,
  onClose,
  onSubmit,
  isLoading,
  initial,
}: RevenueRecoveryCampaignFormProps) {
  const [name, setName] = useState("");
  const [campaignType, setCampaignType] =
    useState<CreateRevenueRecoveryCampaignPayload["campaign_type"]>("slow_period");
  const [discountType, setDiscountType] =
    useState<CreateRevenueRecoveryCampaignPayload["discount_type"]>("percent");
  const [discountValue, setDiscountValue] = useState("15");
  const [startsAt, setStartsAt] = useState(minDateTimeLocal());
  const [endsAt, setEndsAt] = useState(defaultEnd(minDateTimeLocal()));
  const [mealIds, setMealIds] = useState<string[]>([]);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [notificationTitle, setNotificationTitle] = useState("");
  const [notificationMessage, setNotificationMessage] = useState("");
  const [targetAudience, setTargetAudience] =
    useState<CreateRevenueRecoveryCampaignPayload["target_audience"]>("all");
  const [redemptionLimit, setRedemptionLimit] = useState("");

  const menuQuery = useQuery({
    queryKey: ["admin-menu", "revenue-recovery"],
    queryFn: () => menuAdminService.getAdminMenu(),
    enabled: open,
  });

  const activeMeals = (menuQuery.data?.meals ?? []).filter((m) => m.is_active);

  useEffect(() => {
    if (!open) return;
    if (initial) {
      setName(initial.name);
      setCampaignType(initial.campaign_type);
      setDiscountType(initial.discount_type);
      setDiscountValue(String(initial.discount_value));
      setStartsAt(toLocalInput(initial.starts_at));
      setEndsAt(toLocalInput(initial.ends_at));
      setMealIds(initial.meal_ids ?? []);
      setNotificationsEnabled(initial.notifications_enabled);
      setNotificationTitle(initial.notification_title ?? "");
      setNotificationMessage(initial.notification_message ?? "");
      setTargetAudience(initial.target_audience);
      setRedemptionLimit(initial.redemption_limit ? String(initial.redemption_limit) : "");
    } else {
      const start = minDateTimeLocal();
      setName("");
      setCampaignType("slow_period");
      setDiscountType("percent");
      setDiscountValue("15");
      setStartsAt(start);
      setEndsAt(defaultEnd(start));
      setMealIds([]);
      setNotificationsEnabled(true);
      setNotificationTitle("");
      setNotificationMessage("");
      setTargetAudience("all");
      setRedemptionLimit("");
    }
  }, [open, initial]);

  const discount = Number(discountValue);
  const parsedStart = new Date(startsAt);
  const parsedEnd = new Date(endsAt);
  const isProximity = campaignType === "proximity";
  const isValid = isProximity
    ? name.trim().length > 0 &&
      !Number.isNaN(parsedStart.getTime()) &&
      !Number.isNaN(parsedEnd.getTime()) &&
      parsedEnd > parsedStart
    : name.trim().length > 0 &&
      mealIds.length > 0 &&
      !Number.isNaN(parsedStart.getTime()) &&
      !Number.isNaN(parsedEnd.getTime()) &&
      parsedEnd > parsedStart &&
      discount > 0;

  const toggleMeal = (id: string) => {
    setMealIds((prev) => (prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]));
  };

  const applyPreset = (type: CreateRevenueRecoveryCampaignPayload["campaign_type"]) => {
    const preset = getCampaignTypePreset(type);
    setDiscountType(preset.discountType);
    setDiscountValue(preset.discountValue);
    setStartsAt(preset.startsAt);
    setEndsAt(preset.endsAt);
    setNotificationTitle(preset.notificationTitle);
    setNotificationMessage(preset.notificationMessage);
    setTargetAudience(preset.targetAudience);
  };

  const handleTypeChange = (type: CreateRevenueRecoveryCampaignPayload["campaign_type"]) => {
    setCampaignType(type);
    if (!initial) {
      applyPreset(type);
    }
  };

  const handleSubmit = () => {
    if (!isValid) return;
    onSubmit({
      name: name.trim(),
      campaign_type: campaignType,
      discount_type: discountType,
      discount_value: isProximity ? 0 : discount,
      meal_ids: isProximity ? [] : mealIds,
      starts_at: parsedStart.toISOString(),
      ends_at: parsedEnd.toISOString(),
      notifications_enabled: notificationsEnabled,
      notification_title: notificationTitle.trim() || undefined,
      notification_message: notificationMessage.trim() || undefined,
      target_audience: targetAudience,
      redemption_limit: redemptionLimit ? Number(redemptionLimit) : null,
    });
  };

  return (
    <ModalFrame open={open} onClose={onClose} maxWidth="sm:max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>{initial ? "Edit campaign" : "Create recovery campaign"}</CardTitle>
          <p className="text-sm text-muted">
            {isProximity
              ? "Proximity campaigns show location-based bait in the customer app. Discounts still come from active time-based campaigns at checkout."
              : "Discounted meals apply automatically at checkout. Optional push alerts use your existing PWA notification opt-ins."}
          </p>
        </CardHeader>
        <CardContent className="max-h-[70dvh] space-y-4 overflow-y-auto">
          <Input label="Campaign name" value={name} onChange={(e) => setName(e.target.value)} />
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium">Type</label>
              <select
                className="h-10 w-full rounded-[var(--radius)] border border-border bg-surface-elevated px-3 text-sm"
                value={campaignType}
                onChange={(e) =>
                  handleTypeChange(
                    e.target.value as CreateRevenueRecoveryCampaignPayload["campaign_type"],
                  )
                }
              >
                <option value="closing_soon">Closing Soon</option>
                <option value="happy_hour">Happy Hour</option>
                <option value="slow_period">Slow Period</option>
                <option value="custom">Custom Promotion</option>
                <option value="proximity">Proximity Bait</option>
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">Audience</label>
              <select
                className="h-10 w-full rounded-[var(--radius)] border border-border bg-surface-elevated px-3 text-sm"
                value={targetAudience}
                onChange={(e) =>
                  setTargetAudience(
                    e.target.value as CreateRevenueRecoveryCampaignPayload["target_audience"],
                  )
                }
              >
                <option value="all">All opted-in</option>
                <option value="repeat_customers">Returning customers</option>
                <option value="active_customers">Active (30 days)</option>
              </select>
            </div>
          </div>
          {!isProximity && (
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium">Discount type</label>
              <select
                className="h-10 w-full rounded-[var(--radius)] border border-border bg-surface-elevated px-3 text-sm"
                value={discountType}
                onChange={(e) =>
                  setDiscountType(e.target.value as CreateRevenueRecoveryCampaignPayload["discount_type"])
                }
              >
                <option value="percent">Percent (%)</option>
                <option value="fixed">Fixed amount</option>
              </select>
            </div>
            <Input
              label={discountType === "percent" ? "Discount (%)" : "Discount amount"}
              type="number"
              min={0.01}
              value={discountValue}
              onChange={(e) => setDiscountValue(e.target.value)}
            />
          </div>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Starts at"
              type="datetime-local"
              value={startsAt}
              min={minDateTimeLocal()}
              onChange={(e) => setStartsAt(e.target.value)}
            />
            <Input
              label="Ends at"
              type="datetime-local"
              value={endsAt}
              min={startsAt}
              onChange={(e) => setEndsAt(e.target.value)}
            />
          </div>
          <Input
            label="Redemption limit (optional)"
            type="number"
            min={1}
            value={redemptionLimit}
            onChange={(e) => setRedemptionLimit(e.target.value)}
            placeholder="Unlimited"
          />
          {!isProximity && (
          <div>
            <p className="mb-2 text-sm font-medium">Meals on discount</p>
            <div className="max-h-40 space-y-2 overflow-y-auto rounded-[var(--radius)] border border-border p-2">
              {activeMeals.map((meal) => {
                const selected = mealIds.includes(meal.id);
                const base = toNumber(meal.base_price);
                const promo =
                  discountType === "percent"
                    ? Math.round(base * (1 - discount / 100) * 100) / 100
                    : Math.max(0, base - discount);
                return (
                  <label
                    key={meal.id}
                    className={cn(
                      "flex cursor-pointer items-center gap-3 rounded-[var(--radius)] border px-3 py-2",
                      selected ? "border-primary bg-primary/10" : "border-border",
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={selected}
                      onChange={() => toggleMeal(meal.id)}
                      className="accent-primary"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{meal.name}</p>
                      {selected && (
                        <p className="text-xs text-muted">
                          {formatCurrency(promo)}{" "}
                          <span className="line-through">{formatCurrency(base)}</span>
                        </p>
                      )}
                    </div>
                  </label>
                );
              })}
            </div>
          </div>
          )}
          <label className="flex cursor-pointer items-start gap-3 rounded-[var(--radius)] border border-border p-3">
            <input
              type="checkbox"
              className="mt-0.5 accent-primary"
              checked={notificationsEnabled}
              onChange={(e) => setNotificationsEnabled(e.target.checked)}
            />
            <div>
              <p className="text-sm font-medium">Send push notification on activation</p>
              <p className="text-xs text-muted">Uses existing customer notification preferences</p>
            </div>
          </label>
          {notificationsEnabled && (
            <>
              <Input
                label="Notification title (optional)"
                value={notificationTitle}
                onChange={(e) => setNotificationTitle(e.target.value)}
              />
              <div>
                <label className="mb-1.5 block text-sm font-medium">Notification message (optional)</label>
                <textarea
                  className="min-h-[80px] w-full rounded-[var(--radius)] border border-border bg-surface-elevated px-3 py-2 text-sm"
                  value={notificationMessage}
                  onChange={(e) => setNotificationMessage(e.target.value)}
                />
              </div>
            </>
          )}
          <div className="flex flex-wrap gap-2">
            <Button onClick={handleSubmit} isLoading={isLoading} disabled={!isValid}>
              {initial ? "Save changes" : "Create campaign"}
            </Button>
            <Button variant="secondary" onClick={onClose} disabled={isLoading}>
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    </ModalFrame>
  );
}
