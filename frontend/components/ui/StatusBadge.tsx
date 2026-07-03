import { cn } from "@/lib/utils";
import { Badge } from "./Badge";

const statusConfig: Record<string, { label: string; className: string }> = {
  pending: { label: "Pending", className: "bg-status-pending/20 text-status-pending" },
  accepted: { label: "Accepted", className: "bg-status-pending/20 text-status-pending" },
  preparing: { label: "Preparing", className: "bg-status-preparing/20 text-status-preparing" },
  ready: { label: "Ready", className: "bg-status-ready/20 text-status-ready" },
  completed: { label: "Completed", className: "bg-status-completed/20 text-status-completed" },
  cancelled: { label: "Cancelled", className: "bg-status-cancelled/20 text-status-cancelled" },
};

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  const config = statusConfig[status] ?? {
    label: status,
    className: "bg-surface-elevated text-muted",
  };

  return (
    <Badge className={cn(config.className, className)}>
      {config.label}
    </Badge>
  );
}
