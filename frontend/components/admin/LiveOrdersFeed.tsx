"use client";

import type { Order } from "@/lib/types";
import { displayOrderStatus, orderStatusColor } from "@/lib/order-analytics";
import { formatCurrency } from "@/lib/utils";
import { LoadingSkeleton } from "@/components/ui/LoadingSkeleton";
import { cn } from "@/lib/utils";

interface LiveOrdersFeedProps {
  orders: Order[];
  isLoading?: boolean;
}

function shortOrderId(id: string): string {
  return `#${id.slice(0, 8).toUpperCase()}`;
}

export function LiveOrdersFeed({ orders, isLoading }: LiveOrdersFeedProps) {
  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <LoadingSkeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  if (orders.length === 0) {
    return <p className="text-sm text-muted">No active orders right now.</p>;
  }

  return (
    <ul className="space-y-2">
      {orders.map((order) => {
        const label = displayOrderStatus(order.status);
        return (
          <li
            key={order.id}
            className="flex items-center justify-between gap-3 rounded-[var(--radius)] border border-border px-3 py-2.5"
          >
            <div className="min-w-0">
              <p className="font-mono text-sm font-medium">{shortOrderId(order.id)}</p>
              <p className={cn("text-xs capitalize", orderStatusColor(order.status))}>{label}</p>
            </div>
            <span className="shrink-0 font-mono text-sm font-semibold">
              {formatCurrency(order.total_amount)}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
