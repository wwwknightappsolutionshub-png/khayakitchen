import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Standard table class — use inside TableScroll for horizontal scroll on mobile. */
export const BACKEND_TABLE_CLASS = "w-full min-w-[640px] text-sm";

interface TableScrollProps {
  children: ReactNode;
  className?: string;
  bordered?: boolean;
}

export function TableScroll({ children, className, bordered = true }: TableScrollProps) {
  return (
    <div
      className={cn(
        "-mx-4 overflow-x-auto overscroll-x-contain px-4 sm:mx-0 sm:px-0",
        bordered && "rounded-[var(--radius)] border border-border",
        className,
      )}
    >
      {children}
    </div>
  );
}
