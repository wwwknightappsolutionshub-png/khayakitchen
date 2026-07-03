import { useQuery } from "@tanstack/react-query";
import { ordersService } from "@/services/orders.service";
import { realtimeService } from "@/services/realtime.service";
import { useHybridInterval } from "@/hooks/useHybridInterval";

export function useOrderTracking(orderId: string | null) {
  const pollInterval = useHybridInterval(10_000, 15_000);

  return useQuery({
    queryKey: ["order-tracking", orderId],
    queryFn: async () => {
      if (!orderId) throw new Error("No order id");

      try {
        const status = await realtimeService.getOrderStatus(orderId);
        const response = await ordersService.getOrders();
        const order = response.orders.find((o) => o.id === orderId);
        if (order) {
          return { ...order, status: status.status };
        }
      } catch {
        // fall through
      }

      const response = await ordersService.getOrders();
      const order = response.orders.find((o) => o.id === orderId);
      if (!order) throw new Error("Order not found");
      return order;
    },
    enabled: !!orderId,
    refetchInterval: pollInterval,
    retry: 1,
  });
}
