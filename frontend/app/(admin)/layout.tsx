import type { Metadata } from "next";
import { AdminAuthGuard } from "@/components/admin/AdminAuthGuard";
import { AdminShell } from "@/components/admin/AdminShell";
import { AdminWorkspaceSync } from "@/components/admin/AdminWorkspaceSync";
import { RealtimeProvider } from "@/providers/RealtimeProvider";

export const metadata: Metadata = {
  title: "Admin",
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminAuthGuard>
      <RealtimeProvider channels={["admin", "kitchen"]}>
        <AdminWorkspaceSync>
          <AdminShell>{children}</AdminShell>
        </AdminWorkspaceSync>
      </RealtimeProvider>
    </AdminAuthGuard>
  );
}
