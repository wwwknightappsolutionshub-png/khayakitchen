"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Leaf, Send, Copy, Pause, Play, Archive, Trash2, Pencil } from "lucide-react";
import { BackendPage } from "@/components/shared/BackendPage";
import { KpiCard } from "@/components/ui/KpiCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { TableRowSkeleton } from "@/components/ui/LoadingSkeleton";
import { BACKEND_TABLE_CLASS, TableScroll } from "@/components/ui/TableScroll";
import { RevenueRecoveryCampaignForm } from "@/components/admin/RevenueRecoveryCampaignForm";
import { UpgradeLimitModal } from "@/components/shared/UpgradeLimitModal";
import { revenueRecoveryService } from "@/services/revenue-recovery.service";
import { useAuthStore } from "@/stores/auth-store";
import { ApiClientError } from "@/lib/api-client";
import { parseLimitError, type LimitErrorInfo } from "@/lib/limit-error";
import { formatDate, formatCurrency } from "@/lib/utils";
import type { RevenueRecoveryCampaign } from "@/lib/types";

const TYPE_LABELS: Record<string, string> = {
  closing_soon: "Closing Soon",
  happy_hour: "Happy Hour",
  slow_period: "Slow Period",
  custom: "Custom",
};

export default function RevenueRecoveryPage() {
  const queryClient = useQueryClient();
  const role = useAuthStore((s) => s.user?.role);
  const canManage = role === "owner" || role === "super_admin";

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<RevenueRecoveryCampaign | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [limitError, setLimitError] = useState<LimitErrorInfo | null>(null);
  const [showLimitModal, setShowLimitModal] = useState(false);

  const dashboardQuery = useQuery({
    queryKey: ["revenue-recovery", "dashboard"],
    queryFn: () => revenueRecoveryService.getDashboard(),
  });

  const campaignsQuery = useQuery({
    queryKey: ["revenue-recovery", "campaigns"],
    queryFn: () => revenueRecoveryService.listCampaigns(),
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["revenue-recovery"] });
    queryClient.invalidateQueries({ queryKey: ["storefront"] });
  };

  const actionMutation = useMutation({
    mutationFn: async ({
      action,
      id,
      payload,
    }: {
      action: string;
      id?: string;
      payload?: Parameters<typeof revenueRecoveryService.createCampaign>[0];
    }) => {
      if (action === "create" && payload) return revenueRecoveryService.createCampaign(payload);
      if (action === "update" && id && payload)
        return revenueRecoveryService.updateCampaign(id, payload);
      if (action === "duplicate" && id) return revenueRecoveryService.duplicateCampaign(id);
      if (action === "activate" && id) return revenueRecoveryService.activateCampaign(id);
      if (action === "pause" && id) return revenueRecoveryService.pauseCampaign(id);
      if (action === "resume" && id) return revenueRecoveryService.resumeCampaign(id);
      if (action === "deactivate" && id) return revenueRecoveryService.deactivateCampaign(id);
      if (action === "archive" && id) return revenueRecoveryService.archiveCampaign(id);
      if (action === "delete" && id) return revenueRecoveryService.deleteCampaign(id);
      if (action === "notify" && id) return revenueRecoveryService.sendNotification(id);
      throw new Error("Unknown action");
    },
    onSuccess: () => {
      setFormOpen(false);
      setEditing(null);
      setErrorMessage(null);
      invalidate();
    },
    onError: (err) => {
      const parsed = parseLimitError(err);
      if (parsed) {
        setLimitError(parsed);
        setShowLimitModal(true);
        setErrorMessage(null);
        return;
      }
      setErrorMessage(err instanceof ApiClientError ? err.message : "Action failed.");
    },
  });

  const dashboard = dashboardQuery.data;
  const campaigns = campaignsQuery.data?.campaigns ?? [];

  return (
    <BackendPage>
      <header className="backend-header items-start">
        <div className="flex items-center gap-3">
          <Leaf className="h-7 w-7 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Revenue Recovery</h1>
            <p className="text-sm text-muted">
              Recover revenue from slow periods with time-limited offers and push alerts
            </p>
          </div>
        </div>
        {canManage && (
          <div className="backend-header-actions">
            <Button
              onClick={() => {
                setEditing(null);
                setFormOpen(true);
              }}
            >
              New campaign
            </Button>
          </div>
        )}
      </header>

      <section className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Active campaigns" value={dashboard?.campaigns_active ?? 0} />
        <KpiCard
          label="Recovered revenue"
          value={dashboard?.recovered_revenue ?? 0}
          format="currency"
        />
        <KpiCard label="Campaign orders" value={dashboard?.campaign_orders ?? 0} />
        <KpiCard
          label="Order rate (opens)"
          value={`${dashboard?.redemption_rate ?? 0}%`}
        />
      </section>

      <section className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Notifications sent" value={dashboard?.notifications_sent ?? 0} />
        <KpiCard label="Notifications delivered" value={dashboard?.notifications_delivered ?? 0} />
        <KpiCard label="Notification opens" value={dashboard?.notifications_opened ?? 0} />
        <KpiCard
          label="Open rate (delivered)"
          value={`${dashboard?.notification_open_rate ?? 0}%`}
        />
      </section>

      <section className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <KpiCard label="Discounted meals sold" value={dashboard?.meals_sold ?? 0} />
        <KpiCard label="Campaign redemptions" value={dashboard?.redemptions ?? 0} />
      </section>

      {errorMessage ? (
        <p className="mb-4 rounded-[var(--radius)] border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-400">
          {errorMessage}
        </p>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Campaigns</CardTitle>
        </CardHeader>
        <TableScroll bordered={false}>
          <table className={BACKEND_TABLE_CLASS}>
            <thead>
              <tr className="border-b border-border text-left text-muted">
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">Window</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Orders</th>
                <th className="px-4 py-3 font-medium">Recovered</th>
                <th className="px-4 py-3 font-medium" />
              </tr>
            </thead>
            <tbody>
              {campaignsQuery.isLoading &&
                Array.from({ length: 4 }).map((_, i) => <TableRowSkeleton key={i} cols={7} />)}
              {!campaignsQuery.isLoading && campaigns.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-muted">
                    No recovery campaigns yet
                  </td>
                </tr>
              )}
              {campaigns.map((campaign) => (
                <tr key={campaign.id} className="border-b border-border">
                  <td className="px-4 py-3 font-medium">{campaign.name}</td>
                  <td className="px-4 py-3 text-muted">
                    {TYPE_LABELS[campaign.campaign_type] ?? campaign.campaign_type}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted whitespace-nowrap">
                    {formatDate(campaign.starts_at)} → {formatDate(campaign.ends_at)}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant="outline">{campaign.status}</Badge>
                  </td>
                  <td className="px-4 py-3 font-mono">{campaign.orders_count}</td>
                  <td className="px-4 py-3 font-mono">
                    {formatCurrency(Number(campaign.recovered_revenue))}
                  </td>
                  <td className="px-4 py-3">
                    {canManage && (
                      <div className="flex flex-wrap gap-1">
                        {["draft", "paused", "deactivated"].includes(campaign.status) && (
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => {
                              setEditing(campaign);
                              setFormOpen(true);
                            }}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        {["draft", "paused", "deactivated", "scheduled"].includes(campaign.status) && (
                          <Button
                            size="sm"
                            onClick={() =>
                              actionMutation.mutate({ action: "activate", id: campaign.id })
                            }
                            isLoading={actionMutation.isPending}
                          >
                            <Play className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        {campaign.status === "active" && (
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() =>
                              actionMutation.mutate({ action: "pause", id: campaign.id })
                            }
                          >
                            <Pause className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        {campaign.status === "paused" && (
                          <Button
                            size="sm"
                            onClick={() =>
                              actionMutation.mutate({ action: "resume", id: campaign.id })
                            }
                          >
                            <Play className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        {["active", "paused", "scheduled"].includes(campaign.status) && (
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() =>
                              actionMutation.mutate({ action: "deactivate", id: campaign.id })
                            }
                          >
                            Stop
                          </Button>
                        )}
                        {["active", "scheduled"].includes(campaign.status) && (
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() =>
                              actionMutation.mutate({ action: "notify", id: campaign.id })
                            }
                          >
                            <Send className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() =>
                            actionMutation.mutate({ action: "duplicate", id: campaign.id })
                          }
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </Button>
                        {campaign.status === "deactivated" && (
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() =>
                              actionMutation.mutate({ action: "archive", id: campaign.id })
                            }
                          >
                            <Archive className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        {["draft", "archived"].includes(campaign.status) && (
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() =>
                              actionMutation.mutate({ action: "delete", id: campaign.id })
                            }
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableScroll>
      </Card>

      <RevenueRecoveryCampaignForm
        open={formOpen}
        initial={editing}
        onClose={() => {
          setFormOpen(false);
          setEditing(null);
        }}
        isLoading={actionMutation.isPending}
        onSubmit={(payload) =>
          actionMutation.mutate(
            editing
              ? { action: "update", id: editing.id, payload }
              : { action: "create", payload },
          )
        }
      />
      <UpgradeLimitModal
        open={showLimitModal}
        onClose={() => setShowLimitModal(false)}
        limitError={limitError}
      />
    </BackendPage>
  );
}
