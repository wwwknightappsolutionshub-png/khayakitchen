export const PICKUP_READY_LABEL = "Ready for Pickup";
export const DELIVERY_READY_LABEL = "Out for Delivery";

export function getStatusSteps(orderType: string) {
  const readyLabel = orderType === "delivery" ? DELIVERY_READY_LABEL : PICKUP_READY_LABEL;

  return [
    { key: "received", label: "Order Received" },
    { key: "cooking", label: "Cooking Started" },
    { key: "almost", label: "Almost Ready" },
    { key: "ready", label: readyLabel },
    { key: "done", label: "Completed" },
  ];
}

export function getCurrentStepIndex(status: string): number {
  if (status === "pending" || status === "accepted") return 0;
  if (status === "preparing") return 1;
  if (status === "ready") return 3;
  if (status === "completed") return 4;
  return 0;
}

export function getHumanStatusLabel(status: string, orderType: string): string {
  if (status === "pending" || status === "accepted") return "Order Received";
  if (status === "preparing") return "Cooking Started";
  if (status === "ready") {
    return orderType === "delivery" ? DELIVERY_READY_LABEL : PICKUP_READY_LABEL;
  }
  if (status === "completed") return "Completed";
  if (status === "cancelled") return "Cancelled";
  return "Order Received";
}

export function getEstimatedMinutes(status: string): number {
  if (status === "completed" || status === "cancelled") return 0;
  if (status === "ready") return 5;
  if (status === "preparing") return 15;
  return 25;
}
