import { useQuery } from "@tanstack/react-query";
import { customerOrdersService } from "@/services/customer-orders.service";
import { realtimeService } from "@/services/realtime.service";
import { useHybridInterval } from "@/hooks/useHybridInterval";

const PHONE_STORAGE_KEY = "khayaos-customer-phone";

function readStoredPhone(): string | null {
  if (typeof window === "undefined") return null;
  const phone = localStorage.getItem(PHONE_STORAGE_KEY)?.trim();
  return phone || null;
}

export function useOrderTracking(orderId: string | null) {
  const pollInterval = useHybridInterval(10_000, 15_000);
  const phone = typeof window !== "undefined" ? readStoredPhone() : null;

  return useQuery({
    queryKey: ["order-tracking", orderId, phone],
    queryFn: async () => {
      if (!orderId) throw new Error("No order id");
      const customerPhone = readStoredPhone();
      if (!customerPhone) throw new Error("Phone required to track order");

      const { order } = await customerOrdersService.getOrder(orderId, customerPhone);

      try {
        const status = await realtimeService.getOrderStatus(orderId);
        return { ...order, status: status.status || order.status };
      } catch {
        return order;
      }
    },
    enabled: !!orderId,
    refetchInterval: pollInterval,
    retry: 1,
  });
}
