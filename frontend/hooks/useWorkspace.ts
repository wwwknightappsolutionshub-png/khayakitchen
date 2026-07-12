"use client";

import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { workspaceService } from "@/services/workspace.service";
import { applyWorkspaceRuntime } from "@/lib/workspace-runtime";
import { useAuth } from "@/hooks/useAuth";

export function useWorkspace(enabled = true) {
  const { user, isAuthenticated } = useAuth();
  const canLoad =
    enabled &&
    isAuthenticated &&
    Boolean(user?.tenant_id) &&
    user?.role !== "super_admin";

  const query = useQuery({
    queryKey: ["workspace"],
    queryFn: () => workspaceService.getWorkspace(),
    enabled: canLoad,
    staleTime: 60_000,
  });

  useEffect(() => {
    if (!query.data?.workspace) return;
    applyWorkspaceRuntime(query.data.workspace);
  }, [query.data?.workspace]);

  return query;
}
