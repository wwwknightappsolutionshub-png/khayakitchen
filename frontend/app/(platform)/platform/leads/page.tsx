"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { UserPlus } from "lucide-react";
import { BackendPage } from "@/components/shared/BackendPage";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { referralService } from "@/services/referral.service";
import { formatDate } from "@/lib/utils";
import { BACKEND_TABLE_CLASS, TableScroll } from "@/components/ui/TableScroll";

const STATUSES = ["", "invited", "clicked", "signed_up", "rewarded", "rejected", "expired"];

export default function PlatformLeadsPage() {
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [referrer, setReferrer] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [applied, setApplied] = useState({
    status: "",
    search: "",
    referrer: "",
    from: "",
    to: "",
  });

  const leadsQuery = useQuery({
    queryKey: ["platform-leads", applied],
    queryFn: () =>
      referralService.listLeads({
        status: applied.status || undefined,
        search: applied.search || undefined,
        referrer: applied.referrer || undefined,
        from: applied.from || undefined,
        to: applied.to || undefined,
        per_page: 50,
      }),
  });

  const leads = leadsQuery.data?.leads ?? [];

  return (
    <BackendPage>
      <header className="backend-header">
        <div className="flex items-center gap-3">
          <UserPlus className="h-7 w-7 text-violet-400" />
          <div>
            <h1 className="text-2xl font-bold text-violet-50">Leads</h1>
            <p className="text-sm text-violet-200/70">
              Tenant referral invites — email, phone, and invite date
            </p>
          </div>
        </div>
      </header>

      <Card className="mb-4 border-violet-500/20 bg-[#0f1218]">
        <CardHeader>
          <CardTitle className="text-violet-100">Filters</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-end gap-3">
          <div>
            <label className="mb-1 block text-xs text-violet-300/70">Status</label>
            <select
              className="h-10 rounded-lg border border-violet-500/30 bg-[#0a0c10] px-3 text-sm text-violet-100"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              {STATUSES.map((s) => (
                <option key={s || "all"} value={s}>
                  {s || "All"}
                </option>
              ))}
            </select>
          </div>
          <div className="min-w-[180px] flex-1">
            <label className="mb-1 block text-xs text-violet-300/70">Search email / phone</label>
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search…"
              className="border-violet-500/30 bg-[#0a0c10] text-violet-100"
            />
          </div>
          <div className="min-w-[160px] flex-1">
            <label className="mb-1 block text-xs text-violet-300/70">Referrer tenant</label>
            <Input
              value={referrer}
              onChange={(e) => setReferrer(e.target.value)}
              placeholder="Name or slug"
              className="border-violet-500/30 bg-[#0a0c10] text-violet-100"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-violet-300/70">From</label>
            <Input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="border-violet-500/30 bg-[#0a0c10] text-violet-100"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-violet-300/70">To</label>
            <Input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="border-violet-500/30 bg-[#0a0c10] text-violet-100"
            />
          </div>
          <Button
            type="button"
            onClick={() => setApplied({ status, search, referrer, from, to })}
          >
            Apply
          </Button>
        </CardContent>
      </Card>

      <Card className="border-violet-500/20 bg-[#0f1218]">
        <CardContent className="p-0">
          <TableScroll>
            <table className={BACKEND_TABLE_CLASS}>
              <thead>
                <tr className="border-b border-violet-500/20 text-left text-xs text-violet-300/70">
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Phone</th>
                  <th className="px-4 py-3">Invite sent</th>
                  <th className="px-4 py-3">Referrer</th>
                  <th className="px-4 py-3">Channel</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Code</th>
                  <th className="px-4 py-3">Converted</th>
                </tr>
              </thead>
              <tbody>
                {leadsQuery.isLoading && (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-sm text-violet-300/70">
                      Loading leads…
                    </td>
                  </tr>
                )}
                {!leadsQuery.isLoading && leads.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-sm text-violet-300/70">
                      No leads yet
                    </td>
                  </tr>
                )}
                {leads.map((lead) => (
                  <tr key={lead.id} className="border-b border-violet-500/10 text-sm text-violet-100">
                    <td className="px-4 py-3">{lead.prospect_email || "—"}</td>
                    <td className="px-4 py-3 font-mono text-xs">{lead.prospect_phone || "—"}</td>
                    <td className="px-4 py-3 text-xs text-violet-300/80">
                      {lead.invited_at ? formatDate(lead.invited_at) : "—"}
                    </td>
                    <td className="px-4 py-3">
                      {lead.referrer_tenant
                        ? `${lead.referrer_tenant.name} (${lead.referrer_tenant.slug})`
                        : "—"}
                    </td>
                    <td className="px-4 py-3 capitalize">{lead.channel}</td>
                    <td className="px-4 py-3 capitalize">{lead.status.replace(/_/g, " ")}</td>
                    <td className="px-4 py-3 font-mono text-xs">{lead.referral_code?.code || "—"}</td>
                    <td className="px-4 py-3">
                      {lead.referred_tenant
                        ? `${lead.referred_tenant.name} (${lead.referred_tenant.slug})`
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableScroll>
          {leadsQuery.data?.meta && (
            <p className="px-4 py-3 text-xs text-violet-300/60">
              Showing {leads.length} of {leadsQuery.data.meta.total} leads
            </p>
          )}
        </CardContent>
      </Card>
    </BackendPage>
  );
}
