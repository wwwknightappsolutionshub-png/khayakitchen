import { Suspense } from "react";
import ResetPasswordClient from "./ResetPasswordClient";

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="text-sm text-muted">Loading…</div>}>
      <ResetPasswordClient />
    </Suspense>
  );
}
