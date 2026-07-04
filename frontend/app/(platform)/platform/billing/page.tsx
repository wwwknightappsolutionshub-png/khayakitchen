"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Receipt, Users } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { pricingService } from "@/services/pricing.service";
import { platformService } from "@/services/platform.service";
import { formatDate } from "@/lib/utils";

export default function PlatformBillingPage() {
  const queryClient = useQueryClient();
  const [assignTenant, setAssignTenant] = useState("");
  const [assignPlan, setAssignPlan] = useState("");
  const [assignStatus, setAssignStatus] = useState("active");
  const [assignBilling, setAssignBilling] = useState("current");

  const subsQuery = useQuery({
    queryKey: ["platform-subscriptions"],
    queryFn: () => pricingService.getSubscriptions(),
  });
  const plansQuery = useQuery({
    queryKey: ["platform-plans"],
    queryFn: () => pricingService.getPlatformPlans(),
  });
  const tenantsQuery = useQuery({
    queryKey: ["platform", "tenants"],
    queryFn: () => platformService.getTenants(),
  });
  const upgradesQuery = useQuery({
    queryKey: ["platform-upgrade-requests"],
    queryFn: () => pricingService.listUpgradeRequests(),
  });

  const assignMutation = useMutation({
    mutationFn: () =>
      pricingService.assignSubscription({
        tenant_id: assignTenant,
        plan_id: assignPlan,
        status: assignStatus,
        billing_status: assignBilling,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["platform-subscriptions"] });
      setAssignTenant("");
      setAssignPlan("");
    },
  });

  const statusMutation = useMutation({
    mutationFn: ({
      tenantId,
      status,
      billing_status,
    }: {
      tenantId: string;
      status: string;
      billing_status?: string;
    }) => pricingService.updateSubscriptionStatus(tenantId, { status, billing_status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["platform-subscriptions"] }),
  });

  const subscriptions = subsQuery.data?.subscriptions ?? [];
  const plans = (plansQuery.data?.plans ?? []).filter((p) => !p.deleted_at);
  const tenants = tenantsQuery.data?.tenants ?? [];
  const upgradeRequests = upgradesQuery.data?.requests ?? [];

  return (
    <div className="animate-fade-in">
      <header className="mb-6 flex items-center gap-3">
        <Receipt className="h-7 w-7 text-violet-400" />
        <div>
          <h1 className="text-2xl font-bold text-violet-50">Billing</h1>
          <p className="text-sm text-violet-200/60">Subscriptions, plans, and upgrade requests</p>
        </div>
      </header>

      <div className="space-y-6">
        <Card className="border-violet-500/20 bg-[#0f1118]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-violet-50">
              <Users className="h-4 w-4" />
              Assign plan to tenant
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 lg:grid-cols-5">
            <select
              className="h-10 rounded-[var(--radius)] border border-violet-500/20 bg-[#0a0c10] px-3 text-sm text-violet-100"
              value={assignTenant}
              onChange={(e) => setAssignTenant(e.target.value)}
            >
              <option value="">Select tenant</option>
              {tenants.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
            <select
              className="h-10 rounded-[var(--radius)] border border-violet-500/20 bg-[#0a0c10] px-3 text-sm text-violet-100"
              value={assignPlan}
              onChange={(e) => setAssignPlan(e.target.value)}
            >
              <option value="">Select plan</option>
              {plans.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            <select
              className="h-10 rounded-[var(--radius)] border border-violet-500/20 bg-[#0a0c10] px-3 text-sm text-violet-100"
              value={assignStatus}
              onChange={(e) => setAssignStatus(e.target.value)}
            >
              <option value="active">Active</option>
              <option value="trial">Trial</option>
              <option value="suspended">Suspended</option>
            </select>
            <select
              className="h-10 rounded-[var(--radius)] border border-violet-500/20 bg-[#0a0c10] px-3 text-sm text-violet-100"
              value={assignBilling}
              onChange={(e) => setAssignBilling(e.target.value)}
            >
              <option value="current">Current</option>
              <option value="pending_renewal">Pending renewal</option>
              <option value="overdue">Overdue</option>
            </select>
            <Button
              onClick={() => assignMutation.mutate()}
              disabled={!assignTenant || !assignPlan}
              isLoading={assignMutation.isPending}
            >
              Assign
            </Button>
          </CardContent>
        </Card>

        <Card className="border-violet-500/20 bg-[#0f1118]">
          <CardHeader>
            <CardTitle className="text-violet-50">Subscriptions</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-violet-500/20 text-left text-violet-300/60">
                  <th className="pb-3 font-medium">Tenant</th>
                  <th className="pb-3 font-medium">Plan</th>
                  <th className="pb-3 font-medium">Status</th>
                  <th className="pb-3 font-medium">Billing</th>
                  <th className="pb-3 font-medium">Started</th>
                  <th className="pb-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {subscriptions.map((sub) => (
                  <tr key={sub.id} className="border-b border-violet-500/10">
                    <td className="py-3 text-violet-100">{sub.tenant?.name ?? sub.tenant_id}</td>
                    <td className="py-3 text-violet-200">{sub.plan?.name ?? sub.plan_id}</td>
                    <td className="py-3">
                      <Badge variant="outline">{sub.status}</Badge>
                    </td>
                    <td className="py-3">
                      <Badge variant={sub.billing_status === "overdue" ? "warning" : "outline"}>
                        {sub.billing_status ?? "current"}
                      </Badge>
                    </td>
                    <td className="py-3 text-muted">
                      {sub.started_at ? formatDate(sub.started_at) : "—"}
                    </td>
                    <td className="py-3">
                      <div className="flex flex-wrap gap-1">
                        {sub.status !== "active" && (
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() =>
                              statusMutation.mutate({
                                tenantId: sub.tenant_id,
                                status: "active",
                              })
                            }
                          >
                            Activate
                          </Button>
                        )}
                        {sub.status !== "suspended" && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() =>
                              statusMutation.mutate({
                                tenantId: sub.tenant_id,
                                status: "suspended",
                              })
                            }
                          >
                            Suspend
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {subscriptions.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-muted">
                      No subscriptions yet
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>

        <Card className="border-violet-500/20 bg-[#0f1118]">
          <CardHeader>
            <CardTitle className="text-violet-50">Upgrade requests</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-violet-500/20 text-left text-violet-300/60">
                  <th className="pb-3 font-medium">Tenant</th>
                  <th className="pb-3 font-medium">Current plan</th>
                  <th className="pb-3 font-medium">Requested</th>
                  <th className="pb-3 font-medium">Status</th>
                  <th className="pb-3 font-medium">Message</th>
                  <th className="pb-3 font-medium">Date</th>
                </tr>
              </thead>
              <tbody>
                {upgradeRequests.map((req) => (
                  <tr key={req.id} className="border-b border-violet-500/10">
                    <td className="py-3 text-violet-100">{req.tenant?.name ?? req.tenant_id}</td>
                    <td className="py-3 text-violet-200">
                      {req.currentPlan?.name ?? req.current_plan_id ?? "—"}
                    </td>
                    <td className="py-3 text-violet-200">
                      {req.requestedPlan?.name ?? req.requested_plan_id ?? "—"}
                    </td>
                    <td className="py-3">
                      <Badge variant={req.status === "pending" ? "warning" : "outline"}>
                        {req.status}
                      </Badge>
                    </td>
                    <td className="max-w-xs truncate py-3 text-muted">{req.message ?? "—"}</td>
                    <td className="py-3 text-muted">
                      {req.created_at ? formatDate(req.created_at) : "—"}
                    </td>
                  </tr>
                ))}
                {upgradeRequests.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-muted">
                      No upgrade requests
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
