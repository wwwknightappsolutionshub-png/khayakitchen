"use client";

import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { hardResetPwa } from "@/lib/pwa";

interface PwaUpdateBannerProps {
  onDismiss?: () => void;
}

export function PwaUpdateBanner({ onDismiss }: PwaUpdateBannerProps) {
  return (
    <div
      role="status"
      className="fixed inset-x-0 bottom-0 z-[600] border-t border-amber-500/30 bg-[#14100c]/95 px-4 py-3 backdrop-blur-md"
    >
      <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-amber-100">Update available</p>
          <p className="text-xs text-zinc-400">Refresh KhayaOS to load the latest version.</p>
        </div>
        <div className="flex items-center gap-2">
          {onDismiss ? (
            <Button type="button" variant="ghost" size="sm" onClick={onDismiss}>
              Later
            </Button>
          ) : null}
          <Button
            type="button"
            size="sm"
            className="border-0 bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 text-white hover:from-amber-400 hover:via-orange-400 hover:to-rose-400"
            onClick={() => void hardResetPwa()}
          >
            <RefreshCw className="h-4 w-4" />
            Update now
          </Button>
        </div>
      </div>
    </div>
  );
}
