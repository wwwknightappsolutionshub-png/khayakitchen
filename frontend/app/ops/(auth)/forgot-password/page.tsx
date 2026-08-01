import { Suspense } from "react";
import ForgotPasswordClient from "./ForgotPasswordClient";

export default function ForgotPasswordPage() {
  return (
    <Suspense fallback={<div className="text-sm text-muted">Loading…</div>}>
      <ForgotPasswordClient />
    </Suspense>
  );
}
