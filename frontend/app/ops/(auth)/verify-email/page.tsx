import { Suspense } from "react";
import VerifyEmailClient from "./VerifyEmailClient";

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<div className="text-sm text-muted">Verifying…</div>}>
      <VerifyEmailClient />
    </Suspense>
  );
}
