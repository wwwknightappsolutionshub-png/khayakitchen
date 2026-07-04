import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface ScrollTabsProps {
  children: ReactNode;
  className?: string;
}

/** Horizontally scrollable tab bar on mobile; wraps on larger screens. */
export function ScrollTabs({ children, className }: ScrollTabsProps) {
  return (
    <div className={cn("-mx-4 overflow-x-auto overscroll-x-contain px-4 sm:mx-0 sm:px-0", className)}>
      <div className="flex w-max min-w-full flex-nowrap gap-1 rounded-[var(--radius)] border border-border bg-surface p-1 sm:w-full sm:flex-wrap">
        {children}
      </div>
    </div>
  );
}
