"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Gift } from "lucide-react";
import { BackendPage } from "@/components/shared/BackendPage";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { loyaltyService } from "@/services/loyalty.service";
import { ApiClientError } from "@/lib/api-client";
import { useToast } from "@/providers/ToastProvider";
import { cn } from "@/lib/utils";
import type { LoyaltyPackage } from "@/lib/types";

export default function LoyaltyPage() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    description: "",
    package_type: "stamp" as "stamp" | "points",
    goal_value: "10",
    reward_type: "free_meal",
    reward_value: "",
    reward_label: "Free meal",
  });

  const program = useQuery({
    queryKey: ["loyalty", "program"],
    queryFn: () => loyaltyService.getProgram(),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["loyalty", "program"] });

  const settingsMutation = useMutation({
    mutationFn: (enrollments_paused: boolean) =>
      loyaltyService.updateSettings({ enrollments_paused }),
    onSuccess: (data) => {
      invalidate();
      showToast(
        data.settings.enrollments_paused ? "New enrollments paused" : "New enrollments open",
        "Existing members keep earning and redeeming.",
      );
    },
    onError: (err) =>
      setError(err instanceof ApiClientError ? err.message : "Failed to update settings"),
  });

  const createMutation = useMutation({
    mutationFn: () =>
      loyaltyService.createPackage({
        name: form.name,
        description: form.description || null,
        package_type: form.package_type,
        goal_value: Number(form.goal_value),
        reward_type: form.reward_type,
        reward_value: form.reward_value ? Number(form.reward_value) : null,
        reward_label: form.reward_label,
        is_active: true,
      }),
    onSuccess: () => {
      setForm({
        name: "",
        description: "",
        package_type: "stamp",
        goal_value: "10",
        reward_type: "free_meal",
        reward_value: "",
        reward_label: "Free meal",
      });
      invalidate();
      showToast("Package created", "Customers will see it once enrolled.");
    },
    onError: (err) =>
      setError(err instanceof ApiClientError ? err.message : "Failed to create package"),
  });

  const togglePackage = useMutation({
    mutationFn: (pkg: LoyaltyPackage) =>
      loyaltyService.updatePackage(pkg.id, { is_active: !pkg.is_active }),
    onSuccess: () => {
      invalidate();
      showToast("Package updated");
    },
    onError: (err) =>
      setError(err instanceof ApiClientError ? err.message : "Failed to update package"),
  });

  const notifyMutation = useMutation({
    mutationFn: () => loyaltyService.notifyQualified("eligible_or_active"),
    onSuccess: (data) => {
      showToast("Loyalty alert sent", `Reached ${data.notified} qualified customer(s).`);
    },
    onError: (err) =>
      setError(err instanceof ApiClientError ? err.message : "Failed to notify customers"),
  });

  const settings = program.data?.settings;
  const analytics = program.data?.analytics;
  const paused = !!settings?.enrollments_paused;

  return (
    <BackendPage>
      <header className="backend-header">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <Gift className="h-7 w-7 text-primary" />
            <div>
              <h1 className="text-2xl font-bold">Loyalty</h1>
              <p className="text-sm text-muted">
                Packages, enrollments, and referral rewards
                {analytics?.free_until ? ` · Trial until ${analytics.free_until}` : ""}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-[var(--radius)] border border-border bg-surface-elevated px-3 py-2">
            <div className="text-right">
              <p className="text-sm font-medium">New enrollments</p>
              <p className="text-xs text-muted">{paused ? "Paused" : "Open"}</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={!paused}
              disabled={settingsMutation.isPending}
              onClick={() => settingsMutation.mutate(!paused)}
              className={cn(
                "relative h-7 w-12 shrink-0 rounded-full transition-colors",
                !paused ? "bg-primary" : "bg-border",
              )}
            >
              <span
                className={cn(
                  "absolute top-0.5 left-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform",
                  !paused && "translate-x-5",
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

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Active members" value={analytics?.members_active ?? 0} />
        <Stat label="Eligible" value={analytics?.members_eligible ?? 0} />
        <Stat label="Points out" value={analytics?.points_outstanding ?? 0} />
        <Stat label="Referrals credited" value={analytics?.referrals_credited ?? 0} />
      </div>

      <div className="mb-6 flex flex-wrap gap-3">
        <Button
          variant="secondary"
          isLoading={notifyMutation.isPending}
          onClick={() => notifyMutation.mutate()}
        >
          Alert qualified customers
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Define loyalty package</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input
              label="Name"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
            <Input
              label="Description"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            />
            <div>
              <label className="mb-1.5 block text-sm font-medium">Type</label>
              <select
                className="h-10 w-full rounded-[var(--radius)] border border-border bg-surface-elevated px-3 text-sm"
                value={form.package_type}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    package_type: e.target.value as "stamp" | "points",
                  }))
                }
              >
                <option value="stamp">Stamp (meals)</option>
                <option value="points">Points</option>
              </select>
            </div>
            <Input
              label="Goal to meet"
              type="number"
              value={form.goal_value}
              onChange={(e) => setForm((f) => ({ ...f, goal_value: e.target.value }))}
            />
            <div>
              <label className="mb-1.5 block text-sm font-medium">Reward type</label>
              <select
                className="h-10 w-full rounded-[var(--radius)] border border-border bg-surface-elevated px-3 text-sm"
                value={form.reward_type}
                onChange={(e) => setForm((f) => ({ ...f, reward_type: e.target.value }))}
              >
                <option value="free_meal">Free meal</option>
                <option value="percent_off">Percent off</option>
                <option value="fixed_credit">Fixed credit</option>
                <option value="custom">Custom</option>
              </select>
            </div>
            <Input
              label="Reward label"
              value={form.reward_label}
              onChange={(e) => setForm((f) => ({ ...f, reward_label: e.target.value }))}
            />
            <Input
              label="Reward value (optional)"
              value={form.reward_value}
              onChange={(e) => setForm((f) => ({ ...f, reward_value: e.target.value }))}
            />
            <Button
              disabled={!form.name.trim() || createMutation.isPending}
              isLoading={createMutation.isPending}
              onClick={() => createMutation.mutate()}
            >
              Save package
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Active packages</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {(program.data?.packages ?? []).map((pkg) => (
              <div
                key={pkg.id}
                className="flex items-start justify-between gap-3 rounded-[var(--radius)] border border-border px-3 py-3"
              >
                <div>
                  <p className="font-medium">{pkg.name}</p>
                  <p className="text-xs text-muted">
                    {pkg.package_type === "stamp" ? "Stamps" : "Points"} · goal {pkg.goal_value} ·{" "}
                    {pkg.reward_label}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={pkg.is_active ? "secondary" : "outline"}>
                    {pkg.is_active ? "Active" : "Off"}
                  </Badge>
                  <Button size="sm" variant="secondary" onClick={() => togglePackage.mutate(pkg)}>
                    {pkg.is_active ? "Deactivate" : "Activate"}
                  </Button>
                </div>
              </div>
            ))}
            {(program.data?.packages ?? []).length === 0 && (
              <p className="text-sm text-muted">No packages yet — create one on the left.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Members</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {(program.data?.members ?? []).map((row) => (
            <div
              key={row.account.customer_id}
              className="flex items-center justify-between gap-3 border-b border-border py-2 last:border-0"
            >
              <div>
                <p className="font-medium">{row.customer?.name ?? "Customer"}</p>
                <p className="text-xs text-muted">{row.customer?.phone}</p>
              </div>
              <div className="text-right text-sm">
                <Badge variant="secondary">{row.account.membership_status ?? "prospect"}</Badge>
                <p className="mt-1 font-mono text-xs">
                  {row.account.points_balance} pts · {row.account.stamps_balance ?? 0} stamps
                </p>
              </div>
            </div>
          ))}
          {(program.data?.members ?? []).length === 0 && (
            <p className="text-sm text-muted">No loyalty accounts yet.</p>
          )}
        </CardContent>
      </Card>
    </BackendPage>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <Card>
      <CardContent className="py-4">
        <p className="text-xs text-muted">{label}</p>
        <p className="font-mono text-2xl font-bold text-primary">{value}</p>
      </CardContent>
    </Card>
  );
}
