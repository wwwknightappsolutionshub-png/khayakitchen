"use client";

import { ModalPortal } from "@/components/ui/ModalPortal";
import { Button } from "@/components/ui/Button";
import { Lock } from "lucide-react";

interface ComingSoonModalProps {
  open: boolean;
  moduleName: string;
  onClose: () => void;
}

export function ComingSoonModal({ open, moduleName, onClose }: ComingSoonModalProps) {
  return (
    <ModalPortal open={open} onClose={onClose}>
      <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
        <button
          type="button"
          className="absolute inset-0 bg-black/60 backdrop-blur-[2px]"
          onClick={onClose}
          aria-label="Close"
        />
        <div
          role="dialog"
          aria-modal="true"
          className="relative z-10 w-full max-w-sm rounded-2xl border border-violet-500/30 bg-surface p-6 text-center shadow-2xl"
        >
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-violet-500/15 text-violet-400">
            <Lock className="h-5 w-5" />
          </div>
          <h2 className="text-lg font-semibold">{moduleName}</h2>
          <p className="mt-2 text-sm text-muted">This module is coming soon.</p>
          <Button className="mt-6 w-full" onClick={onClose}>
            Got it
          </Button>
        </div>
      </div>
    </ModalPortal>
  );
}
