"use client";

import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export interface CustomerButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
}

const variants = {
  primary: "bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)]",
  secondary:
    "bg-[var(--surface-elevated)] text-[var(--foreground)] border border-[var(--border)] hover:border-[var(--primary)]/40",
  ghost: "bg-transparent text-[var(--muted)] hover:text-[var(--foreground)]",
};

const sizes = {
  sm: "h-9 px-3 text-sm",
  md: "h-11 px-4 text-sm font-medium",
  lg: "h-12 px-6 text-base font-semibold",
};

export const CustomerButton = forwardRef<HTMLButtonElement, CustomerButtonProps>(
  ({ className, variant = "primary", size = "md", isLoading, disabled, children, ...props }, ref) => (
    <button
      ref={ref}
      disabled={disabled || isLoading}
      className={cn(
        "customer-press inline-flex items-center justify-center gap-2 rounded-xl font-[family-name:var(--font-anek)] transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)]",
        "disabled:opacity-50 disabled:pointer-events-none",
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    >
      {isLoading ? <span className="customer-shimmer h-4 w-16 rounded" /> : children}
    </button>
  ),
);

CustomerButton.displayName = "CustomerButton";
