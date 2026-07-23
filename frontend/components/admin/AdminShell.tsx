"use client";

import { Sidebar } from "@/components/ui/Sidebar";
import { ResponsiveAppShell } from "@/components/shared/ResponsiveAppShell";
import { CustomerChatUrgencyAlerts } from "@/components/admin/CustomerChatUrgencyAlerts";
import { useAuth } from "@/hooks/useAuth";
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
  const subtitle = ROLE_LABELS[user?.role ?? ""] ?? "Admin";
  useStaffPresenceHeartbeat(true);

  return (
    <ResponsiveAppShell
      mobileTitle="KhayaOS"
      mobileSubtitle={subtitle}
      renderSidebar={(props) => <Sidebar {...props} />}
    >
      <CustomerChatUrgencyAlerts />
      {children}
    </ResponsiveAppShell>
  );
}
