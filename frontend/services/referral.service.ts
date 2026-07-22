import { api } from "@/lib/api-client";

export type TenantReferralInvite = {
  id: string;
  prospect_email?: string | null;
  prospect_phone?: string | null;
  prospect_name?: string | null;
  channel: string;
  status: string;
  invited_at?: string | null;
};

export type TenantReferralSummary = {
  code: string;
  link: string;
  reward_days: number;
  referee_trial_days: number;
  stats: {
    invites_sent: number;
    successful_referrals: number;
    days_earned: number;
  };
  invites: TenantReferralInvite[];
  whatsapp_share_text: string;
};

export type PlatformLead = {
  id: string;
  prospect_email?: string | null;
  prospect_phone?: string | null;
  prospect_name?: string | null;
  channel: string;
  status: string;
  invited_at?: string | null;
  signed_up_at?: string | null;
  rewarded_at?: string | null;
  referrer_tenant?: { id: string; name: string; slug: string } | null;
  referred_tenant?: { id: string; name: string; slug: string } | null;
  referral_code?: { id: string; code: string } | null;
};

export const referralService = {
  getSummary() {
    return api.get<TenantReferralSummary>("/referrals");
  },

  invite(payload: {
    email: string;
    phone: string;
    name?: string;
    channel?: "email" | "whatsapp";
  }) {
    return api.post<{
      lead: TenantReferralInvite;
      whatsapp_url: string | null;
      link: string;
    }>("/referrals/invite", payload);
  },

  listLeads(params?: {
    status?: string;
    search?: string;
    from?: string;
    to?: string;
    referrer?: string;
    referrer_tenant_id?: string;
    page?: number;
    per_page?: number;
  }) {
    const query = new URLSearchParams();
    if (params?.status) query.set("status", params.status);
    if (params?.search) query.set("search", params.search);
    if (params?.from) query.set("from", params.from);
    if (params?.to) query.set("to", params.to);
    if (params?.referrer) query.set("referrer", params.referrer);
    if (params?.referrer_tenant_id) query.set("referrer_tenant_id", params.referrer_tenant_id);
    if (params?.page) query.set("page", String(params.page));
    if (params?.per_page) query.set("per_page", String(params.per_page));
    const qs = query.toString();
    return api.get<{ leads: PlatformLead[]; meta: Record<string, number> }>(
      `/platform/leads${qs ? `?${qs}` : ""}`,
    );
  },
};
