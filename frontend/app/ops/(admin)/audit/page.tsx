import { redirect } from "next/navigation";

/** Audit logs are platform-admin only; redirect tenant users away from legacy URL. */
export default function AuditPage() {
  redirect("/ops/admin/dashboard");
}
