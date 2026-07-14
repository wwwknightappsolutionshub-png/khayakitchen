import { cn } from "@/lib/utils";
import { Badge } from "./Badge";

const statusConfig: Record<string, { label: string; className: string }> = {
  pending: { label: "Pending", className: "bg-amber-500/20 text-amber-400 ring-1 ring-amber-500/30" },
  accepted: { label: "Accepted", className: "bg-blue-500/20 text-blue-400 ring-1 ring-blue-500/30" },
  preparing: { label: "Preparing", className: "bg-orange-500/20 text-orange-400 ring-1 ring-orange-500/30" },
  ready: { label: "Ready", className: "bg-emerald-500/20 text-emerald-400 ring-1 ring-emerald-500/30" },
  completed: { label: "Completed", className: "bg-status-completed/20 text-status-completed" },
  cancelled: { label: "Rejected", className: "bg-red-500/20 text-red-400 ring-1 ring-red-500/30" },
  undone: { label: "Undone", className: "bg-zinc-500/20 text-zinc-300 ring-1 ring-zinc-500/40" },
};

export function getKitchenCardClass(status: string, isNew: boolean): string {
  if (isNew) return "border-primary bg-primary/5 ring-2 ring-primary/30";
  const map: Record<string, string> = {
    pending: "border-amber-500/50 bg-amber-500/5",
    accepted: "border-blue-500/50 bg-blue-500/5",
    preparing: "border-orange-500/50 bg-orange-500/5",
    ready: "border-emerald-500/50 bg-emerald-500/5",
    completed: "border-border bg-surface-elevated/30 opacity-75",
    cancelled: "border-red-500/40 bg-red-500/5 opacity-75",
    undone: "border-zinc-500/40 bg-zinc-500/5 opacity-80",
  };
  return map[status] ?? "border-border hover:border-primary/30";
}

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
