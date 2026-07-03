"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import type { ModuleStatus } from "@/lib/types";
import { ModuleStatusBadge } from "./ModuleStatusBoard";
import { ComingSoonModal } from "./ComingSoonModal";
import { Lock } from "lucide-react";

interface ModuleTileProps {
  name: string;
  status: ModuleStatus;
  description?: string | null;
}

export function ModuleTile({ name, status, description }: ModuleTileProps) {
  const [showModal, setShowModal] = useState(false);
  const isLocked = status === "coming-soon" || status === "disabled";

  const handleClick = () => {
    if (isLocked) setShowModal(true);
  };

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        disabled={!isLocked}
        className={cn(
          "relative rounded-[var(--radius)] border p-4 text-left transition-colors",
          isLocked
            ? "cursor-pointer border-border/60 bg-surface-elevated/30 opacity-60 hover:border-violet-500/30"
            : "border-border bg-surface hover:border-secondary/40",
        )}
      >
        {isLocked && (
          <Lock className="absolute right-3 top-3 h-4 w-4 text-muted" />
        )}
        <p className="font-medium">{name}</p>
        {description && <p className="mt-1 text-xs text-muted line-clamp-2">{description}</p>}
        <div className="mt-3">
          <ModuleStatusBadge status={status} />
        </div>
      </button>

      <ComingSoonModal
        open={showModal}
        moduleName={name}
        onClose={() => setShowModal(false)}
      />
    </>
  );
}
