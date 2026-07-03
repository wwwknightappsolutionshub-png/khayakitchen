"use client";

import { useCallback, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/Card";
import { StatusBadge, getKitchenCardClass } from "@/components/ui/StatusBadge";
import { Button } from "@/components/ui/Button";
import { CardSkeleton } from "@/components/ui/LoadingSkeleton";
import { ReconnectingIndicator } from "@/components/shared/ReconnectingIndicator";
import { kitchenService } from "@/services/kitchen.service";
import { useHybridInterval } from "@/hooks/useHybridInterval";
import { useRealtimeEvent } from "@/hooks/useRealtimeEvent";
import { formatCurrency } from "@/lib/utils";
import { ChefHat, Clock, Bell } from "lucide-react";

const ACTIVE_STATUSES = new Set(["pending", "accepted", "preparing", "ready"]);

export default function KitchenPage() {
  const queryClient = useQueryClient();
  const pollInterval = useHybridInterval(4_000, 5_000);
  const [newTicketId, setNewTicketId] = useState<string | null>(null);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["kitchen", "orders"],
    queryFn: () => kitchenService.getActiveOrders(),
    refetchInterval: pollInterval,
    staleTime: 2_000,
  });

  const onRealtimeEvent = useCallback(
    (event: string, payload: Record<string, unknown>) => {
      if (event === "NewKitchenTicket" || event === "OrderCreated") {
        const orderId = payload.order_id as string | undefined;
        if (orderId) setNewTicketId(orderId);
        queryClient.invalidateQueries({ queryKey: ["kitchen"] });
      }
    },
    [queryClient],
  );

  useRealtimeEvent(onRealtimeEvent);

  const updateMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      kitchenService.updateOrderStatus(id, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["kitchen"] }),
  });

  const orders = data?.orders ?? [];
  const activeOrders = orders.filter((o) => ACTIVE_STATUSES.has(o.status));
  const recentOrders = orders.filter((o) => !ACTIVE_STATUSES.has(o.status));

  return (
    <div className="animate-fade-in">
      <header className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <ChefHat className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-2xl font-bold sm:text-3xl">Kitchen</h1>
            <p className="text-sm text-muted">New orders appear immediately · tap-friendly</p>
          </div>
        </div>
        <ReconnectingIndicator />
      </header>

      {newTicketId && (
        <div
          className="mb-4 flex animate-pulse items-center justify-between gap-3 rounded-xl border border-primary/40 bg-primary/10 px-4 py-3"
          role="alert"
        >
          <div className="flex items-center gap-2 text-sm font-medium">
            <Bell className="h-4 w-4 text-primary" />
            New order #{newTicketId.slice(0, 6).toUpperCase()}
          </div>
          <button
            type="button"
            className="text-xs text-muted underline"
            onClick={() => setNewTicketId(null)}
          >
            Dismiss
          </button>
        </div>
      )}

      {isFetching && !isLoading && (
        <p className="mb-3 text-xs text-muted">Syncing…</p>
      )}

      {isLoading && (
        <div className="grid gap-4">
          {Array.from({ length: 2 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      )}

      {!isLoading && orders.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center py-16 text-center">
            <ChefHat className="mb-4 h-12 w-12 text-muted" />
            <p className="text-xl font-medium">No active orders</p>
            <p className="text-muted">New tickets appear instantly when connected</p>
          </CardContent>
        </Card>
      )}

      {activeOrders.length > 0 && (
        <div className="mb-6 grid gap-4">
          {activeOrders.map((order) => (
            <KitchenOrderCard
              key={order.id}
              order={order}
              isNew={order.id === newTicketId}
              updateMutation={updateMutation}
            />
          ))}
        </div>
      )}

      {recentOrders.length > 0 && (
        <div>
          <h2 className="mb-3 text-sm font-medium text-muted">Recently completed / rejected</h2>
          <div className="grid gap-4">
            {recentOrders.map((order) => (
              <KitchenOrderCard
                key={order.id}
                order={order}
                isNew={false}
                updateMutation={updateMutation}
                readOnly
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

type KitchenOrder = {
  id: string;
  status: string;
  order_type: string;
  total_amount: number;
  items?: { id: string; quantity: number; meal?: { name: string } }[];
};

function KitchenOrderCard({
  order,
  isNew,
  updateMutation,
  readOnly = false,
}: {
  order: KitchenOrder;
  isNew: boolean;
  updateMutation: {
    mutate: (vars: { id: string; status: string }) => void;
    isPending: boolean;
  };
  readOnly?: boolean;
}) {
  return (
    <Card className={`border-2 transition-colors ${getKitchenCardClass(order.status, isNew)}`}>
      <CardContent className="py-4 sm:py-5">
        <div className="mb-4 flex items-start justify-between gap-2">
          <div>
            <p className="font-mono text-xl font-bold sm:text-2xl">
              #{order.id.slice(0, 6).toUpperCase()}
            </p>
            <p className="mt-1 flex items-center gap-1 text-sm capitalize text-muted">
              <Clock className="h-3.5 w-3.5" />
              {order.order_type}
            </p>
          </div>
          <StatusBadge status={order.status} />
        </div>

        {order.items && order.items.length > 0 && (
          <ul className="mb-4 space-y-2">
            {order.items.map((item) => (
              <li key={item.id} className="flex justify-between text-base sm:text-lg">
                <span>
                  <span className="font-mono font-bold">{item.quantity}×</span>{" "}
                  {item.meal?.name ?? "Item"}
                </span>
              </li>
            ))}
          </ul>
        )}

        <div className="flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
          <span className="font-mono text-lg font-bold sm:text-xl">
            {formatCurrency(order.total_amount)}
          </span>
          {!readOnly && (
            <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
              {order.status === "pending" && (
                <>
                  <Button
                    size="lg"
                    className="min-h-12 w-full text-base"
                    onClick={() => updateMutation.mutate({ id: order.id, status: "accepted" })}
                  >
                    Accept
                  </Button>
                  <Button
                    size="lg"
                    variant="danger"
                    className="min-h-12 w-full text-base"
                    onClick={() => updateMutation.mutate({ id: order.id, status: "cancelled" })}
                  >
                    Reject
                  </Button>
                </>
              )}
              {order.status === "accepted" && (
                <Button
                  size="lg"
                  variant="secondary"
                  className="min-h-12 w-full text-base"
                  onClick={() => updateMutation.mutate({ id: order.id, status: "preparing" })}
                >
                  Cooking
                </Button>
              )}
              {order.status === "preparing" && (
                <Button
                  size="lg"
                  className="min-h-12 w-full text-base"
                  onClick={() => updateMutation.mutate({ id: order.id, status: "ready" })}
                >
                  Ready
                </Button>
              )}
              {order.status === "ready" && (
                <Button
                  size="lg"
                  variant="secondary"
                  className="min-h-12 w-full text-base"
                  onClick={() => updateMutation.mutate({ id: order.id, status: "completed" })}
                >
                  Complete
                </Button>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
