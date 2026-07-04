"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { ModalPortal } from "@/components/ui/ModalPortal";

interface ModalFrameProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  className?: string;
  panelClassName?: string;
  maxWidth?: string;
}

/** Mobile-safe modal: bottom sheet on small screens, centered on desktop. */
export function ModalFrame({
  open,
  onClose,
  children,
  className,
  panelClassName,
  maxWidth = "sm:max-w-lg",
}: ModalFrameProps) {
  return (
    <ModalPortal open={open} onClose={onClose}>
      <div
        className={cn(
          "fixed inset-0 z-[300] flex items-end justify-center sm:items-center sm:p-4",
          className,
        )}
      >
        <button
          type="button"
          className="absolute inset-0 bg-black/70"
          onClick={onClose}
          aria-label="Close"
        />
        <div
          className={cn(
            "relative z-10 max-h-[90dvh] w-full overflow-y-auto overscroll-contain",
            "rounded-t-2xl sm:rounded-[var(--radius-card-lg)]",
            maxWidth,
            panelClassName,
          )}
        >
          {children}
        </div>
      </div>
    </ModalPortal>
  );
}
