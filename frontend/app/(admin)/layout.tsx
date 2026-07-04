import type { Metadata } from "next";
import { AdminAuthGuard } from "@/components/admin/AdminAuthGuard";
import { AdminShell } from "@/components/admin/AdminShell";
import { RealtimeProvider } from "@/providers/RealtimeProvider";

export const metadata: Metadata = {
  title: "Admin",
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminAuthGuard>
      <RealtimeProvider channels={["admin", "kitchen"]}>
        <AdminShell>{children}</AdminShell>
      </RealtimeProvider>
    </AdminAuthGuard>
  );
}
