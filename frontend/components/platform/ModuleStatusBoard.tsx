"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { BACKEND_TABLE_CLASS, TableScroll } from "@/components/ui/TableScroll";
import type { ModuleStatus } from "@/lib/types";
import { ComingSoonModal } from "./ComingSoonModal";

const statusStyles: Record<ModuleStatus, string> = {
  completed: "bg-secondary/20 text-secondary",
  "in-progress": "bg-primary/20 text-primary",
  "coming-soon": "bg-surface-elevated text-muted",
  disabled: "bg-danger/15 text-danger",
};

const statusLabels: Record<ModuleStatus, string> = {
  completed: "Completed",
  "in-progress": "In Progress",
  "coming-soon": "Coming Soon",
  disabled: "Disabled",
};

export function ModuleStatusBadge({ status }: { status: ModuleStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize",
        statusStyles[status],
      )}
    >
      {statusLabels[status]}
    </span>
  );
}

interface ModuleStatusBoardProps {
  modules: Array<{
    id: string;
    name: string;
    status: ModuleStatus;
    enabled: boolean;
    description?: string | null;
  }>;
  onLockedClick?: (name: string) => void;
}

export function ModuleStatusBoard({ modules, onLockedClick }: ModuleStatusBoardProps) {
  const [lockedModule, setLockedModule] = useState<string | null>(null);

  const handleClick = (name: string, status: ModuleStatus) => {
    if (status === "coming-soon" || status === "disabled") {
      setLockedModule(name);
      onLockedClick?.(name);
    }
  };

  return (
    <>
      <TableScroll>
        <table className={BACKEND_TABLE_CLASS}>
          <thead>
            <tr className="border-b border-border bg-surface-elevated/50 text-left text-muted">
              <th className="px-4 py-3 font-medium">Module</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Enabled</th>
            </tr>
          </thead>
          <tbody>
            {modules.map((module) => {
              const isLocked =
                module.status === "coming-soon" || module.status === "disabled";

              return (
                <tr
                  key={module.id}
                  onClick={() => handleClick(module.name, module.status)}
                  className={cn(
                    "border-b border-border last:border-0",
                    isLocked
                      ? "cursor-pointer opacity-70 hover:bg-surface-elevated/40"
                      : "hover:bg-surface-elevated/30",
                  )}
                >
                  <td className="px-4 py-3 font-medium">{module.name}</td>
                  <td className="px-4 py-3">
                    <ModuleStatusBadge status={module.status} />
                  </td>
                  <td className="px-4 py-3 text-muted">
                    {module.enabled ? "Yes" : "No"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </TableScroll>

      <ComingSoonModal
        open={lockedModule !== null}
        moduleName={lockedModule ?? "Module"}
        onClose={() => setLockedModule(null)}
      />
    </>
  );
}
