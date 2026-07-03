import { useMutation } from "@tanstack/react-query";
import { customerOrdersService, type CustomerOrderPayload } from "@/services/customer-orders.service";

export function usePlaceOrder() {
  return useMutation({
    mutationFn: (payload: CustomerOrderPayload) => customerOrdersService.createOrder(payload),
  });
}
