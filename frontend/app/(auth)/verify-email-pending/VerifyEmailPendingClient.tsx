"use client";

import Link from "next/link";
import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { authService } from "@/services/auth.service";
import { ApiClientError } from "@/lib/api-client";

export default function VerifyEmailPendingClient() {
  const searchParams = useSearchParams();
  const email = searchParams.get("email") ?? "";
  const tenant = searchParams.get("tenant") ?? "";
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isResending, setIsResending] = useState(false);

  const handleResend = async () => {
    if (!email) {
      setError("Missing email address. Return to sign up and try again.");
      return;
    }

    setIsResending(true);
    setError(null);
    setMessage(null);

    try {
      const response = await authService.resendVerification(email, tenant || undefined);
      setMessage(response.message);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Unable to resend verification email.");
    } finally {
      setIsResending(false);
    }
  };

  return (
    <Card className="w-full max-w-md animate-fade-in">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-xl font-bold text-white">
          ✉
        </div>
        <CardTitle className="text-2xl">Confirm your email</CardTitle>
        <CardDescription>
          We sent a confirmation link to activate your KhayaOS account.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {email ? (
          <p className="rounded-[var(--radius)] bg-surface-elevated px-3 py-2 text-sm text-foreground">
            <span className="text-muted">Sent to:</span> {email}
          </p>
        ) : null}

        <p className="text-sm text-muted">
          Open the link in your inbox to activate your account. After confirmation, you can sign in
          with the password you created.
        </p>

        {message ? (
          <p className="rounded-[var(--radius)] bg-success/10 px-3 py-2 text-sm text-success">{message}</p>
        ) : null}
        {error ? (
          <p className="rounded-[var(--radius)] bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>
        ) : null}

        <Button type="button" className="w-full" variant="secondary" isLoading={isResending} onClick={handleResend}>
          Resend confirmation email
        </Button>

        <p className="text-center text-xs text-muted">
          Already confirmed?{" "}
          <Link
            href={`/login?${new URLSearchParams({ email, tenant }).toString()}`}
            className="text-primary hover:underline"
          >
            Sign in
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
