"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { authService } from "@/services/auth.service";
import { ApiClientError } from "@/lib/api-client";

export default function VerifyEmailClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const email = searchParams.get("email") ?? "";
  const tenant = searchParams.get("tenant") ?? "";
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("Verifying your email…");

  useEffect(() => {
    if (!token || !email) {
      setStatus("error");
      setMessage("This verification link is invalid.");
      return;
    }

    authService
      .verifyEmail(token, email)
      .then((response) => {
        setStatus("success");
        setMessage(response.message);
      })
      .catch((err) => {
        setStatus("error");
        setMessage(err instanceof ApiClientError ? err.message : "Verification failed.");
      });
  }, [token, email]);

  const loginHref = `/login?${new URLSearchParams({
    email,
    tenant,
    welcome: "1",
  }).toString()}`;

  return (
    <Card className="w-full max-w-md animate-fade-in">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-xl font-bold text-white">
          {status === "success" ? "✓" : status === "error" ? "!" : "…"}
        </div>
        <CardTitle className="text-2xl">
          {status === "success" ? "Email verified" : status === "error" ? "Verification failed" : "Verifying email"}
        </CardTitle>
        <CardDescription>{message}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {status === "success" ? (
          <Button className="w-full" size="lg" onClick={() => router.push(loginHref)}>
            Continue to sign in
          </Button>
        ) : null}

        {status === "error" ? (
          <div className="space-y-3">
            <Link
              href={`/verify-email-pending?${new URLSearchParams({ email, tenant }).toString()}`}
              className="inline-flex h-10 w-full items-center justify-center rounded-[var(--radius)] border border-border bg-surface-elevated text-sm font-medium text-foreground hover:bg-surface"
            >
              Resend confirmation email
            </Link>
            <p className="text-center text-xs text-muted">
              <Link href="/login" className="text-primary hover:underline">
                Back to sign in
              </Link>
            </p>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
