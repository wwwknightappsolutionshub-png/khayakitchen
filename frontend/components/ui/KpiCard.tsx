import { cn, formatCurrency } from "@/lib/utils";
import { Card, CardContent } from "./Card";
import { TrendingDown, TrendingUp, Minus } from "lucide-react";

export interface KpiCardProps {
  label: string;
  value: string | number;
  delta?: number;
  deltaLabel?: string;
  format?: "currency" | "number";
  className?: string;
}

export function KpiCard({ label, value, delta, deltaLabel, format = "number", className }: KpiCardProps) {
  const displayValue =
    format === "currency" ? formatCurrency(value) : value;

  const TrendIcon = delta === undefined ? Minus : delta >= 0 ? TrendingUp : TrendingDown;
  const trendColor =
    delta === undefined ? "text-muted" : delta >= 0 ? "text-secondary" : "text-danger";

  return (
    <Card className={cn("animate-fade-in", className)}>
      <CardContent>
        <p className="text-sm text-muted">{label}</p>
        <p className="mt-1 font-mono text-2xl font-semibold tracking-tight">{displayValue}</p>
        {delta !== undefined && (
          <div className={cn("mt-2 flex items-center gap-1 text-xs", trendColor)}>
            <TrendIcon className="h-3.5 w-3.5" />
            <span className="font-mono">
              {delta >= 0 ? "+" : ""}
              {delta}%
            </span>
            {deltaLabel && <span className="text-muted">{deltaLabel}</span>}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
