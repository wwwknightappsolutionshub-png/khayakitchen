import { useMutation } from "@tanstack/react-query";
import { ordersService } from "@/services/orders.service";
import type { CreateOrderPayload } from "@/lib/types";

export function usePlaceOrder() {
  return useMutation({
    mutationFn: (payload: CreateOrderPayload) => ordersService.createOrder(payload),
  });
}
