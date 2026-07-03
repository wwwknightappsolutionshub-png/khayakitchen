import { type HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "primary" | "secondary" | "warning" | "outline";
}

const variants = {
  default: "bg-surface-elevated text-muted",
  primary: "bg-primary/20 text-primary",
  secondary: "bg-secondary/20 text-secondary",
  warning: "bg-warning/20 text-warning",
  outline: "border border-border text-muted",
};

export function Badge({ className, variant = "default", ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        variants[variant],
        className,
      )}
      {...props}
    />
  );
}
