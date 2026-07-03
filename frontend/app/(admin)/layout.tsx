import type { Metadata } from "next";
import { Sidebar } from "@/components/ui/Sidebar";
import { AdminAuthGuard } from "@/components/admin/AdminAuthGuard";
import { RealtimeProvider } from "@/providers/RealtimeProvider";

export const metadata: Metadata = {
  title: "Admin",
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminAuthGuard>
      <RealtimeProvider channels={["admin", "kitchen"]}>
        <div className="flex h-screen bg-background">
          <Sidebar />
          <main className="flex-1 overflow-y-auto">
            <div className="p-4 sm:p-6 lg:p-8">{children}</div>
          </main>
        </div>
      </RealtimeProvider>
    </AdminAuthGuard>
  );
}
