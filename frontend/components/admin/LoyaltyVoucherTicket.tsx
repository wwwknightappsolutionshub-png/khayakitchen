"use client";

import { Gift } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import type { LoyaltyRedemptionVoucher } from "@/lib/types";

export function LoyaltyVoucherTicket({
  voucher,
  isPending,
  onFulfil,
  onCancel,
}: {
  voucher: LoyaltyRedemptionVoucher;
  isPending?: boolean;
  onFulfil: () => void;
  onCancel: () => void;
}) {
  return (
    <Card className="border-2 border-secondary/40 bg-secondary/5">
      <CardContent className="py-4">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="flex items-center gap-2 text-sm font-medium">
              <Gift className="h-4 w-4 text-secondary" />
              {voucher.customer?.name || "Customer"}
            </p>
            <p className="text-xs text-muted">{voucher.customer?.phone}</p>
          </div>
          <Badge variant="secondary">Pending</Badge>
        </div>
        <p className="font-mono text-3xl font-bold tracking-[0.2em] text-primary">{voucher.code}</p>
        <p className="mt-2 text-sm font-medium">{voucher.reward_label}</p>
        <p className="text-xs text-muted">
          {voucher.points > 0 ? `${voucher.points} pts held` : null}
          {voucher.points > 0 && voucher.stamps > 0 ? " · " : null}
          {voucher.stamps > 0 ? `${voucher.stamps} stamps held` : null}
        </p>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <Button size="lg" disabled={isPending} onClick={onFulfil}>
            Fulfil
          </Button>
          <Button size="lg" variant="secondary" disabled={isPending} onClick={onCancel}>
            Decline
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
