"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Megaphone, Send } from "lucide-react";
import { BackendPage } from "@/components/shared/BackendPage";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { TableRowSkeleton } from "@/components/ui/LoadingSkeleton";
import { BACKEND_TABLE_CLASS, TableScroll } from "@/components/ui/TableScroll";
import { campaignService } from "@/services/campaign.service";
import { useAuthStore } from "@/stores/auth-store";
import type { CreateCampaignPayload } from "@/services/campaign.service";

export default function MarketingPage() {
  const queryClient = useQueryClient();
  const role = useAuthStore((s) => s.user?.role);
  const canManage = role === "owner" || role === "super_admin";

  const [form, setForm] = useState<CreateCampaignPayload>({
    title: "",
    message: "",
    type: "announcement",
    channel: "both",
    target_audience: "all",
  });

  const { data, isLoading } = useQuery({
    queryKey: ["campaigns"],
    queryFn: () => campaignService.listCampaigns(),
  });

  const createMutation = useMutation({
    mutationFn: () => campaignService.createCampaign(form),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      setForm({ title: "", message: "", type: "announcement", channel: "both", target_audience: "all" });
    },
  });

  const sendMutation = useMutation({
    mutationFn: (id: string) => campaignService.sendCampaign(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["campaigns"] }),
  });

  const campaigns = data?.campaigns ?? [];

  return (
    <BackendPage>
      <header className="backend-header">
        <div className="flex items-center gap-3">
          <Megaphone className="h-7 w-7 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Marketing & Notifications</h1>
            <p className="text-sm text-muted">Campaigns to opted-in customers only</p>
          </div>
        </div>
      </header>

      {canManage && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Create Campaign</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              label="Title"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            />
            <div>
              <label className="mb-1.5 block text-sm font-medium">Message</label>
              <textarea
                className="min-h-[100px] w-full rounded-[var(--radius)] border border-border bg-surface-elevated px-3 py-2 text-sm"
                value={form.message}
                onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label className="mb-1.5 block text-sm font-medium">Type</label>
                <select
                  className="h-10 w-full rounded-[var(--radius)] border border-border bg-surface-elevated px-3 text-sm"
                  value={form.type}
                  onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as CreateCampaignPayload["type"] }))}
                >
                  <option value="promo">Promo</option>
                  <option value="announcement">Announcement</option>
                  <option value="info">Info</option>
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium">Channel</label>
                <select
                  className="h-10 w-full rounded-[var(--radius)] border border-border bg-surface-elevated px-3 text-sm"
                  value={form.channel}
                  onChange={(e) => setForm((f) => ({ ...f, channel: e.target.value as CreateCampaignPayload["channel"] }))}
                >
                  <option value="pwa">PWA Push</option>
                  <option value="whatsapp">WhatsApp</option>
                  <option value="both">Both</option>
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium">Audience</label>
                <select
                  className="h-10 w-full rounded-[var(--radius)] border border-border bg-surface-elevated px-3 text-sm"
                  value={form.target_audience}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      target_audience: e.target.value as CreateCampaignPayload["target_audience"],
                    }))
                  }
                >
                  <option value="all">All opted-in</option>
                  <option value="repeat_customers">Returning (2–5 orders)</option>
                  <option value="active_customers">Active (30 days)</option>
                </select>
              </div>
            </div>
            <Button
              onClick={() => createMutation.mutate()}
              isLoading={createMutation.isPending}
              disabled={!form.title || !form.message}
            >
              Save Draft
            </Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Campaigns</CardTitle>
        </CardHeader>
        <TableScroll bordered={false}>
          <table className={BACKEND_TABLE_CLASS}>
            <thead>
              <tr className="border-b border-border text-left text-muted">
                <th className="px-4 py-3 font-medium">Title</th>
                <th className="px-4 py-3 font-medium">Channel</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Sent</th>
                <th className="px-4 py-3 font-medium">Delivered</th>
                <th className="px-4 py-3 font-medium">Failed</th>
                <th className="px-4 py-3 font-medium" />
              </tr>
            </thead>
            <tbody>
              {isLoading &&
                Array.from({ length: 3 }).map((_, i) => <TableRowSkeleton key={i} cols={7} />)}
              {!isLoading && campaigns.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-muted">
                    No campaigns yet
                  </td>
                </tr>
              )}
              {campaigns.map((campaign) => (
                <tr key={campaign.id} className="border-b border-border">
                  <td className="px-4 py-3 font-medium">{campaign.title}</td>
                  <td className="px-4 py-3 capitalize text-muted">{campaign.channel}</td>
                  <td className="px-4 py-3">
                    <Badge variant="outline">{campaign.status}</Badge>
                  </td>
                  <td className="px-4 py-3 font-mono">{campaign.sent_count}</td>
                  <td className="px-4 py-3 font-mono text-status-ready">{campaign.delivered_count}</td>
                  <td className="px-4 py-3 font-mono text-danger">{campaign.failed_count}</td>
                  <td className="px-4 py-3">
                    {canManage && campaign.status === "draft" && (
                      <Button
                        size="sm"
                        onClick={() => sendMutation.mutate(campaign.id)}
                        isLoading={sendMutation.isPending}
                      >
                        <Send className="h-3.5 w-3.5" />
                        Send
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableScroll>
      </Card>
    </BackendPage>
  );
}
