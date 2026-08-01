import { redirect } from "next/navigation";

export default function DashboardRedirectPage() {
  redirect("/ops/admin/dashboard");
}
