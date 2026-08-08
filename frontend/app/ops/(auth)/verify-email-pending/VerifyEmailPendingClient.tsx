"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { authService } from "@/services/auth.service";
import { ApiClientError } from "@/lib/api-client";
import { OPS_ROUTES } from "@/lib/ops-paths";

const CONFETTI_COLORS = ["#e07a5f", "#f59e0b", "#81b29a", "#3d405b", "#f4a261", "#e9c46a", "#2a9d8f", "#fb7185"];
const REDIRECT_SECONDS = 4;

export default function VerifyEmailPendingClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get("email") ?? "";
  const tenant = searchParams.get("tenant") ?? "";
  const kitchen = searchParams.get("kitchen") ?? "";
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isResending, setIsResending] = useState(false);
  const [showConfetti, setShowConfetti] = useState(true);
  const [secondsLeft, setSecondsLeft] = useState(REDIRECT_SECONDS);

  const loginHref = useMemo(() => {
    const params = new URLSearchParams();
    if (email) params.set("email", email);
    if (tenant) params.set("tenant", tenant);
    const query = params.toString();
    return query ? `${OPS_ROUTES.login}?${query}` : OPS_ROUTES.login;
  }, [email, tenant]);

  const confetti = useMemo(
    () =>
      Array.from({ length: 64 }, (_, index) => ({
        id: index,
        left: `${(index * 13 + (index % 7) * 3) % 100}%`,
        delay: `${(index % 16) * 0.05}s`,
        duration: `${2.2 + (index % 6) * 0.28}s`,
        color: CONFETTI_COLORS[index % CONFETTI_COLORS.length],
        rotate: `${(index * 47) % 360}deg`,
        width: `${6 + (index % 5)}px`,
        height: `${10 + (index % 7)}px`,
      })),
    [],
  );

  useEffect(() => {
    const hide = window.setTimeout(() => setShowConfetti(false), 5200);
    return () => window.clearTimeout(hide);
  }, []);

  useEffect(() => {
    const tick = window.setInterval(() => {
      setSecondsLeft((prev) => Math.max(0, prev - 1));
    }, 1000);

    const redirect = window.setTimeout(() => {
      router.replace(loginHref);
    }, REDIRECT_SECONDS * 1000);

    return () => {
      window.clearInterval(tick);
      window.clearTimeout(redirect);
    };
  }, [loginHref, router]);

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
    <>
      {showConfetti ? (
        <div className="signup-confetti-blast pointer-events-none fixed inset-0 z-[90]" aria-hidden>
          {confetti.map((piece) => (
            <span
              key={piece.id}
              className="signup-confetti-piece"
              style={{
                left: piece.left,
                width: piece.width,
                height: piece.height,
                backgroundColor: piece.color,
                animationDelay: piece.delay,
                animationDuration: piece.duration,
                transform: `rotate(${piece.rotate})`,
              }}
            />
          ))}
        </div>
      ) : null}

      <div className="relative z-[95] w-full max-w-md">
        <Card className="w-full animate-fade-in border-amber-500/20 shadow-xl">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-rose-500 text-xl font-bold text-white shadow-lg shadow-orange-500/30">
              ✺
            </div>
            <CardTitle className="text-2xl">
              Congratulations{kitchen ? ` @ ${kitchen}` : ""}
            </CardTitle>
            <CardDescription className="text-base font-medium text-foreground/80">
              You are now onboarded.
            </CardDescription>
            <CardDescription className="pt-2">
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

            <p className="text-center text-sm font-medium text-foreground/80" aria-live="polite">
              Redirecting to sign in in {secondsLeft}s…
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
              <Link href={loginHref} className="text-primary hover:underline">
                Sign in
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
