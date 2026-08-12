"use client";

import { useCallback, useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/Card";
import { StatusBadge, getKitchenCardClass } from "@/components/ui/StatusBadge";
import { Button } from "@/components/ui/Button";
import { CardSkeleton } from "@/components/ui/LoadingSkeleton";
import { BackendPage } from "@/components/shared/BackendPage";
import { ReconnectingIndicator } from "@/components/shared/ReconnectingIndicator";
import { kitchenService } from "@/services/kitchen.service";
import { customMealsService } from "@/services/custom-meals.service";
import { useHybridInterval } from "@/hooks/useHybridInterval";
import { useRealtimeEvent } from "@/hooks/useRealtimeEvent";
import { formatCurrency, cn, formatDate } from "@/lib/utils";
import { getOrderAgeCardClass, getOrderAgeTone } from "@/lib/order-age";
import { ChefHat, Clock, Bell, Utensils, Gift } from "lucide-react";
import { LoyaltyVoucherTicket } from "@/components/admin/LoyaltyVoucherTicket";
import type { CustomMealRequest } from "@/lib/types";

const ACTIVE_STATUSES = new Set(["accepted", "preparing", "ready"]);

export default function KitchenPage() {
  const queryClient = useQueryClient();
  const pollInterval = useHybridInterval(4_000, 5_000);
  const [newTicketId, setNewTicketId] = useState<string | null>(null);
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNowMs(Date.now()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  const { data, isLoading, isFetching, isError, error, refetch } = useQuery({
    queryKey: ["kitchen", "orders"],
    queryFn: () => kitchenService.getActiveOrders(),
    refetchInterval: pollInterval,
    staleTime: 2_000,
  });

  const { data: customMealsData, isLoading: customMealsLoading } = useQuery({
    queryKey: ["kitchen", "custom-meals"],
    queryFn: () => customMealsService.listForStaff(),
    refetchInterval: pollInterval,
    staleTime: 5_000,
  });

  const { data: voucherData } = useQuery({
    queryKey: ["kitchen", "loyalty-vouchers"],
    queryFn: async () => {
      try {
        return await kitchenService.getPendingVouchers();
      } catch {
        return { vouchers: [] };
      }
    },
    refetchInterval: pollInterval,
    staleTime: 2_000,
  });

  const onRealtimeEvent = useCallback(
    (event: string, payload: Record<string, unknown>) => {
      if (event === "NewKitchenTicket" || event === "OrderStatusChanged") {
        const orderId = payload.order_id as string | undefined;
        const status = payload.status as string | undefined;
        if (orderId && (event === "NewKitchenTicket" || status === "accepted")) {
          setNewTicketId(orderId);
        }
        queryClient.invalidateQueries({ queryKey: ["kitchen"] });
      }
      if (
        event === "LoyaltyVoucherCreated" ||
        event === "LoyaltyVoucherFulfilled" ||
        event === "LoyaltyVoucherReleased"
      ) {
        queryClient.invalidateQueries({ queryKey: ["kitchen", "loyalty-vouchers"] });
      }
    },
    [queryClient],
  );

  useRealtimeEvent(onRealtimeEvent);

  const updateMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      kitchenService.updateOrderStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["kitchen"] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
    },
  });

  const customMealMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: "acknowledged" | "closed" }) =>
      customMealsService.updateStatus(id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["kitchen", "custom-meals"] });
    },
  });

  const voucherMutation = useMutation({
    mutationFn: ({ id, action }: { id: string; action: "fulfil" | "cancel" }) =>
      action === "fulfil" ? kitchenService.fulfilVoucher(id) : kitchenService.cancelVoucher(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["kitchen", "loyalty-vouchers"] });
      queryClient.invalidateQueries({ queryKey: ["loyalty"] });
    },
  });

  const orders = Array.isArray(data?.orders) ? data.orders : [];
  const activeOrders = orders.filter((o) => ACTIVE_STATUSES.has(o.status));
  const recentOrders = orders.filter((o) => !ACTIVE_STATUSES.has(o.status));
  const customRequests = (customMealsData?.requests ?? []).filter(
    (r) => r.status === "submitted" || r.status === "acknowledged",
  );
  const pendingVouchers = voucherData?.vouchers ?? [];
  const loadError =
    error instanceof Error ? error.message : isError ? "Failed to load kitchen orders." : null;
  const updateError =
    updateMutation.error instanceof Error
      ? updateMutation.error.message
      : updateMutation.isError
        ? "Failed to update order."
        : null;

  return (
    <BackendPage>
      <header className="backend-header items-start">
        <div className="flex items-center gap-3">
          <ChefHat className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-2xl font-bold sm:text-3xl">Kitchen</h1>
            <p className="text-sm text-muted">
              Accepted tickets appear after floor staff · Preparing confirms you have it · Ready for
              waiter
            </p>
          </div>
        </div>
        <div className="backend-header-actions">
          <ReconnectingIndicator />
        </div>
      </header>

      {newTicketId && (
        <div
          className="mb-4 flex animate-pulse items-center justify-between gap-3 rounded-xl border border-primary/40 bg-primary/10 px-4 py-3"
          role="alert"
        >
          <div className="flex items-center gap-2 text-sm font-medium">
            <Bell className="h-4 w-4 text-primary" />
            New accepted order #{newTicketId.slice(0, 6).toUpperCase()}
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

      {loadError && (
        <div className="mb-4 rounded-xl border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger">
          <p>{loadError}</p>
          <button type="button" className="mt-2 underline" onClick={() => void refetch()}>
            Retry
          </button>
        </div>
      )}

      {updateError && (
        <div className="mb-4 rounded-xl border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger">
          <p>{updateError}</p>
          <button
            type="button"
            className="mt-2 underline"
            onClick={() => updateMutation.reset()}
          >
            Dismiss
          </button>
        </div>
      )}

      {isFetching && !isLoading && <p className="mb-3 text-xs text-muted">Syncing…</p>}

      {pendingVouchers.length > 0 && (
        <section className="mb-6">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-medium text-muted">
            <Gift className="h-4 w-4" />
            Loyalty rewards to fulfil
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {pendingVouchers.map((voucher) => (
              <LoyaltyVoucherTicket
                key={voucher.id}
                voucher={voucher}
                isPending={voucherMutation.isPending}
                onFulfil={() => voucherMutation.mutate({ id: voucher.id, action: "fulfil" })}
                onCancel={() => voucherMutation.mutate({ id: voucher.id, action: "cancel" })}
              />
            ))}
          </div>
        </section>
      )}

      {(customMealsLoading || customRequests.length > 0) && (
        <section className="mb-6">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-medium text-muted">
            <Utensils className="h-4 w-4" />
            Custom meal requests
          </h2>
          {customMealsLoading && customRequests.length === 0 && <CardSkeleton />}
          <div className="grid gap-3">
            {customRequests.map((req) => (
              <CustomMealRequestCard
                key={req.id}
                request={req}
                isPending={customMealMutation.isPending}
                onAcknowledge={() =>
                  customMealMutation.mutate({ id: req.id, status: "acknowledged" })
                }
                onClose={() => customMealMutation.mutate({ id: req.id, status: "closed" })}
              />
            ))}
          </div>
        </section>
      )}

      {isLoading && (
        <div className="grid gap-4">
          {Array.from({ length: 2 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      )}

      {!isLoading && !loadError && orders.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center py-16 text-center">
            <ChefHat className="mb-4 h-12 w-12 text-muted" />
            <p className="text-xl font-medium">No kitchen tickets</p>
            <p className="text-muted">Orders appear here once floor staff accepts them</p>
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
              nowMs={nowMs}
              updateMutation={updateMutation}
            />
          ))}
        </div>
      )}

      {recentOrders.length > 0 && (
        <div>
          <h2 className="mb-3 text-sm font-medium text-muted">Recently completed / cancelled</h2>
          <div className="grid gap-4">
            {recentOrders.map((order) => (
              <KitchenOrderCard
                key={order.id}
                order={order}
                isNew={false}
                nowMs={nowMs}
                updateMutation={updateMutation}
                readOnly
              />
            ))}
          </div>
        </div>
      )}
    </BackendPage>
  );
}

function CustomMealRequestCard({
  request,
  isPending,
  onAcknowledge,
  onClose,
}: {
  request: CustomMealRequest;
  isPending: boolean;
  onAcknowledge: () => void;
  onClose: () => void;
}) {
  return (
    <Card className="border border-secondary/30 bg-secondary/5">
      <CardContent className="py-4">
        <div className="mb-2 flex items-start justify-between gap-2">
          <div>
            <p className="font-semibold">{request.title || "Custom meal"}</p>
            <p className="text-xs text-muted">
              {request.customer?.name ?? "Customer"}
              {request.customer?.phone ? ` · ${request.customer.phone}` : ""}
              {request.created_at ? ` · ${formatDate(request.created_at)}` : ""}
            </p>
          </div>
          <span className="rounded-full bg-surface-elevated px-2 py-0.5 text-xs capitalize text-muted">
            {request.status}
          </span>
        </div>
        <p className="mb-2 text-sm">{request.message}</p>
        {request.constraints && (
          <p className="mb-3 text-xs text-muted">Constraints: {request.constraints}</p>
        )}
        {request.staff_note && (
          <p className="mb-3 text-xs text-muted">Note: {request.staff_note}</p>
        )}
        <div className="flex flex-wrap gap-2">
          {request.status === "submitted" && (
            <Button size="sm" disabled={isPending} onClick={onAcknowledge}>
              Acknowledge
            </Button>
          )}
          {(request.status === "submitted" || request.status === "acknowledged") && (
            <Button size="sm" variant="secondary" disabled={isPending} onClick={onClose}>
              Close
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

type KitchenOrder = {
  id: string;
  status: string;
  order_type: string;
  total_amount: number;
  created_at?: string;
  scheduled_time?: string | null;
  customer_name?: string | null;
  items?: { id: string; quantity: number; meal?: { name: string } }[];
};

function KitchenOrderCard({
  order,
  isNew,
  nowMs,
  updateMutation,
  readOnly = false,
}: {
  order: KitchenOrder;
  isNew: boolean;
  nowMs: number;
  updateMutation: {
    mutate: (vars: { id: string; status: string }) => void;
    isPending: boolean;
  };
  readOnly?: boolean;
}) {
  const ageClass =
    order.created_at && ACTIVE_STATUSES.has(order.status)
      ? getOrderAgeCardClass(getOrderAgeTone(order.created_at, nowMs))
      : getKitchenCardClass(order.status, isNew);

  const pickupLabel =
    order.order_type === "delivery" ? "Delivery time" : "Pickup time";

  return (
    <Card className={cn("border-2 transition-colors", ageClass, isNew && "ring-2 ring-primary/40")}>
      <CardContent className="py-4 sm:py-5">
        <div className="mb-4 flex items-start justify-between gap-2">
          <div>
            <p className="text-base font-semibold sm:text-lg">
              {order.customer_name || "Guest"}
            </p>
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

        <div className="mb-4 grid gap-1 text-sm text-muted">
          <p>
            <span className="font-medium text-foreground">Order time:</span>{" "}
            {order.created_at ? formatDate(order.created_at) : "—"}
          </p>
          <p>
            <span className="font-medium text-foreground">{pickupLabel}:</span>{" "}
            {order.scheduled_time ? formatDate(order.scheduled_time) : "ASAP"}
          </p>
        </div>

        <div className="flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
          <span className="font-mono text-lg font-bold sm:text-xl">
            {formatCurrency(order.total_amount)}
          </span>
          {!readOnly && (
            <div className="grid grid-cols-1 gap-2 sm:flex sm:flex-wrap">
              {order.status === "accepted" && (
                <Button
                  size="lg"
                  variant="secondary"
                  className="min-h-12 w-full text-base"
                  disabled={updateMutation.isPending}
                  onClick={() => updateMutation.mutate({ id: order.id, status: "preparing" })}
                >
                  Preparing
                </Button>
              )}
              {order.status === "preparing" && (
                <Button
                  size="lg"
                  className="min-h-12 w-full text-base"
                  disabled={updateMutation.isPending}
                  onClick={() => updateMutation.mutate({ id: order.id, status: "ready" })}
                >
                  Ready
                </Button>
              )}
              {order.status === "ready" && (
                <p className="text-sm text-muted">Waiting for floor staff to complete</p>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
