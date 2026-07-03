import { cn } from "@/lib/utils";

export function LoadingSkeleton({ className }: { className?: string }) {
  return <div className={cn("skeleton", className)} />;
}

export function CardSkeleton() {
  return (
    <div className="rounded-[var(--radius-card-lg)] border border-border bg-surface p-4">
      <LoadingSkeleton className="mb-3 h-4 w-24" />
      <LoadingSkeleton className="h-8 w-32" />
      <LoadingSkeleton className="mt-3 h-3 w-20" />
    </div>
  );
}

export function TableRowSkeleton({ cols = 4 }: { cols?: number }) {
  return (
    <tr>
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <LoadingSkeleton className="h-4 w-full" />
        </td>
      ))}
    </tr>
  );
}

export function MenuCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-[var(--radius-card-lg)] border border-border bg-surface">
      <LoadingSkeleton className="h-40 w-full rounded-none" />
      <div className="p-4">
        <LoadingSkeleton className="mb-2 h-5 w-3/4" />
        <LoadingSkeleton className="h-4 w-full" />
        <LoadingSkeleton className="mt-3 h-6 w-20" />
      </div>
    </div>
  );
}
