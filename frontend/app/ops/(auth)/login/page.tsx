import { Suspense } from "react";
import LoginPageClient from "./LoginPageClient";

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="text-sm text-muted">Loading sign in…</div>}>
      <LoginPageClient />
    </Suspense>
  );
}
