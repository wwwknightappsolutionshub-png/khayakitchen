"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Gift, Copy, Check, MessageCircle } from "lucide-react";
import { ModalPortal } from "@/components/ui/ModalPortal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { referralService } from "@/services/referral.service";
import { useToast } from "@/providers/ToastProvider";
import { ApiClientError } from "@/lib/api-client";

export function ReferAndRewardModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [copied, setCopied] = useState(false);

  const summary = useQuery({
    queryKey: ["tenant-referrals"],
    queryFn: () => referralService.getSummary(),
    enabled: open,
  });

  const inviteMutation = useMutation({
    mutationFn: () =>
      referralService.invite({
        email: email.trim(),
        phone: phone.trim(),
        name: name.trim() || undefined,
        channel: "email",
      }),
    onSuccess: () => {
      showToast("Invite sent", "They’ll get an email with your referral link.");
      setEmail("");
      setPhone("");
      setName("");
      queryClient.invalidateQueries({ queryKey: ["tenant-referrals"] });
    },
    onError: (err) => {
      showToast(
        "Invite failed",
        err instanceof ApiClientError ? err.message : "Could not send invite.",
      );
    },
  });

  const whatsappMutation = useMutation({
    mutationFn: () =>
      referralService.invite({
        email: email.trim(),
        phone: phone.trim(),
        name: name.trim() || undefined,
        channel: "whatsapp",
      }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["tenant-referrals"] });
      if (res.whatsapp_url) {
        window.open(res.whatsapp_url, "_blank", "noopener,noreferrer");
      }
      showToast("WhatsApp ready", "Share the invite from WhatsApp.");
    },
    onError: (err) => {
      showToast(
        "Invite failed",
        err instanceof ApiClientError ? err.message : "Could not prepare WhatsApp invite.",
      );
    },
  });

  const data = summary.data;
  const canInvite = email.trim().length > 3 && phone.trim().length > 5;

  const stats = useMemo(
    () => [
      { label: "Invites sent", value: data?.stats.invites_sent ?? 0 },
      { label: "Successful", value: data?.stats.successful_referrals ?? 0 },
      { label: "Days earned", value: data?.stats.days_earned ?? 0 },
    ],
    [data],
  );

  const copyLink = async () => {
    if (!data?.link) return;
    try {
      await navigator.clipboard.writeText(data.link);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
      showToast("Link copied", "Share it with another restaurant.");
    } catch {
      showToast("Copy failed", "Select and copy the link manually.");
    }
  };

  const shareWhatsAppLinkOnly = () => {
    if (!data?.whatsapp_share_text) return;
    const url = `https://wa.me/?text=${encodeURIComponent(data.whatsapp_share_text)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <ModalPortal open={open} onClose={onClose}>
      <div className="fixed inset-0 z-[200] flex items-end justify-center bg-black/60 p-4 sm:items-center">
        <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-border bg-surface p-5 shadow-xl">
          <div className="mb-4 flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/15 text-primary">
              <Gift className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-lg font-semibold">Refer & Reward</h2>
              <p className="mt-1 text-sm text-muted">
                Invite another restaurant. They get {data?.referee_trial_days ?? 30} days free —
                you earn {data?.reward_days ?? 30} days when they join.
              </p>
            </div>
            <button type="button" className="text-sm text-muted underline" onClick={onClose}>
              Close
            </button>
          </div>

          <div className="mb-4 grid grid-cols-3 gap-2">
            {stats.map((s) => (
              <div key={s.label} className="rounded-xl border border-border bg-surface-elevated px-3 py-2 text-center">
                <p className="font-mono text-lg font-semibold">{s.value}</p>
                <p className="text-[10px] text-muted">{s.label}</p>
              </div>
            ))}
          </div>

          <div className="mb-4 space-y-2">
            <p className="text-xs font-medium text-muted">Your referral link</p>
            <div className="flex gap-2">
              <Input readOnly value={data?.link ?? "Loading…"} className="font-mono text-xs" />
              <Button type="button" variant="secondary" onClick={copyLink} disabled={!data?.link}>
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
            <Button
              type="button"
              variant="secondary"
              className="w-full gap-2"
              onClick={shareWhatsAppLinkOnly}
              disabled={!data?.link}
            >
              <MessageCircle className="h-4 w-4" />
              Share link on WhatsApp
            </Button>
          </div>

          <div className="space-y-3 rounded-xl border border-border p-3">
            <p className="text-sm font-medium">Send invite</p>
            <Input
              placeholder="Prospect name (optional)"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <Input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <Input
              type="tel"
              placeholder="Phone (WhatsApp)"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button
                className="flex-1"
                disabled={!canInvite || inviteMutation.isPending}
                isLoading={inviteMutation.isPending}
                onClick={() => inviteMutation.mutate()}
              >
                Send email invite
              </Button>
              <Button
                variant="secondary"
                className="flex-1 gap-2"
                disabled={!canInvite || whatsappMutation.isPending}
                isLoading={whatsappMutation.isPending}
                onClick={() => whatsappMutation.mutate()}
              >
                <MessageCircle className="h-4 w-4" />
                WhatsApp invite
              </Button>
            </div>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}
