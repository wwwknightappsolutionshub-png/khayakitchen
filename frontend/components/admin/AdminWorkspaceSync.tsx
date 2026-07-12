"use client";

import { useWorkspace } from "@/hooks/useWorkspace";

export function AdminWorkspaceSync({ children }: { children: React.ReactNode }) {
  useWorkspace(true);
  return <>{children}</>;
}
