import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function ResponsiveDataView({
  mobile,
  children,
  className,
}: {
  mobile: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <div className="space-y-3 md:hidden">{mobile}</div>
      <div className="hidden md:block">{children}</div>
    </div>
  );
}

export function MobileDataCard({
  title,
  subtitle,
  meta,
  rows,
  actions,
  className,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  meta?: ReactNode;
  rows?: { label: string; value: ReactNode }[];
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-[var(--radius)] border border-border bg-surface-elevated/40 p-4",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="font-medium text-foreground">{title}</div>
          {subtitle ? <div className="mt-0.5 text-sm text-muted">{subtitle}</div> : null}
          {meta ? <div className="mt-2">{meta}</div> : null}
        </div>
      </div>
      {rows && rows.length > 0 ? (
        <dl className="mt-3 space-y-2 border-t border-border pt-3">
          {rows.map((row) => (
            <div key={row.label} className="flex items-start justify-between gap-3 text-sm">
              <dt className="text-muted">{row.label}</dt>
              <dd className="text-right font-medium text-foreground">{row.value}</dd>
            </div>
          ))}
        </dl>
      ) : null}
      {actions ? <div className="mt-3 flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}
