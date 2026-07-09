import { Suspense } from "react";
import VerifyEmailPendingClient from "./VerifyEmailPendingClient";

export default function VerifyEmailPendingPage() {
  return (
    <Suspense fallback={<div className="text-sm text-muted">Loading…</div>}>
      <VerifyEmailPendingClient />
    </Suspense>
  );
}
