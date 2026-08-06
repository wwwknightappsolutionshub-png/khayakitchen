"use client";

import { Sidebar } from "@/components/ui/Sidebar";
import { ResponsiveAppShell } from "@/components/shared/ResponsiveAppShell";
import { CustomerChatUrgencyAlerts } from "@/components/admin/CustomerChatUrgencyAlerts";
import { KitchenAvatar } from "@/components/admin/KitchenAvatar";
import { useAuth } from "@/hooks/useAuth";
import { useWorkspace } from "@/hooks/useWorkspace";
import { useStaffPresenceHeartbeat } from "@/hooks/useStaffPresenceHeartbeat";

interface AdminShellProps {
  children: React.ReactNode;
}

const ROLE_LABELS: Record<string, string> = {
  owner: "Owner",
  manager: "Manager",
  kitchen: "Kitchen",
  staff: "Staff",
};

export function AdminShell({ children }: AdminShellProps) {
  const { user } = useAuth();
  const { data: workspaceData } = useWorkspace(true);
  const workspace = workspaceData?.workspace;
  const kitchenName = workspace?.name ?? "KhayaOS";
  const subtitle = ROLE_LABELS[user?.role ?? ""] ?? "Admin";
  useStaffPresenceHeartbeat(true);

  return (
    <ResponsiveAppShell
      mobileTitle={kitchenName}
      mobileSubtitle={subtitle}
      mobileLeading={
        <KitchenAvatar name={kitchenName} logoUrl={workspace?.logo_url} size="sm" />
      }
      renderSidebar={(props) => <Sidebar {...props} />}
    >
      <CustomerChatUrgencyAlerts />
      {children}
    </ResponsiveAppShell>
  );
}
