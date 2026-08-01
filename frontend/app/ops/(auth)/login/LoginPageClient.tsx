"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/hooks/useAuth";
import { ApiClientError } from "@/lib/api-client";

const loginSchema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
  tenant_slug: z.string().optional(),
});

type LoginForm = z.infer<typeof loginSchema>;

function firstDetail(details: Record<string, unknown> | undefined, key: string): string | null {
  const value = details?.[key];
  if (Array.isArray(value) && typeof value[0] === "string") return value[0];
  if (typeof value === "string") return value;
  return null;
}

export default function LoginPageClient() {
  const searchParams = useSearchParams();
  const prefilledEmail = searchParams.get("email") ?? "";
  const prefilledTenant =
    searchParams.get("tenant") ?? searchParams.get("tenant_slug") ?? "";
  const { login, isLoggingIn } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [showWorkspaceSlug, setShowWorkspaceSlug] = useState(Boolean(prefilledTenant));

  useEffect(() => {
    document.documentElement.style.visibility = "";
  }, []);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setError: setFieldError,
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: prefilledEmail, password: "", tenant_slug: prefilledTenant },
  });

  const onSubmit = async (data: LoginForm) => {
    setError(null);
    try {
      // Backend resolves workspace from email when the address is unique.
      await login(data.email, data.password, data.tenant_slug?.trim() || undefined);
    } catch (err) {
      if (err instanceof ApiClientError) {
        const tenantMessage = firstDetail(err.details, "tenant_slug");
        if (tenantMessage) {
          setShowWorkspaceSlug(true);
          setFieldError("tenant_slug", { type: "server", message: tenantMessage });
          setError(tenantMessage);
          return;
        }
        setError(err.message);
      } else {
        setError("Login failed. Please try again.");
      }
    }
  };

  return (
    <Card className="w-full max-w-md animate-fade-in">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-xl font-bold text-white">
          K
        </div>
        <CardTitle className="text-2xl">KhayaOS Ops</CardTitle>
        <CardDescription>Sign in to your business operating system</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input
            label="Email"
            type="email"
            autoComplete="email"
            placeholder="owner@khayaos.com"
            error={errors.email?.message}
            {...register("email")}
          />
          <Input
            label="Password"
            type="password"
            autoComplete="current-password"
            error={errors.password?.message}
            {...register("password")}
          />
          <div className="flex justify-end">
            <Link href={`/ops/forgot-password?${new URLSearchParams({
              email: prefilledEmail,
              tenant: prefilledTenant,
            }).toString()}`} className="text-xs text-primary hover:underline">
              Forgot password?
            </Link>
          </div>
          {showWorkspaceSlug ? (
            <Input
              label="Workspace slug"
              type="text"
              autoComplete="organization"
              placeholder="your-restaurant"
              tooltip="Only needed if this email belongs to more than one workspace."
              error={errors.tenant_slug?.message}
              {...register("tenant_slug")}
            />
          ) : (
            <p className="text-center text-xs text-muted">
              Your workspace is chosen automatically from your email.{" "}
              <button
                type="button"
                className="text-primary hover:underline"
                onClick={() => setShowWorkspaceSlug(true)}
              >
                Enter slug manually
              </button>
            </p>
          )}
          {error && !errors.tenant_slug && (
            <p className="rounded-[var(--radius)] bg-danger/10 px-3 py-2 text-sm text-danger">
              {error}
              {error.includes("fetch") || error.includes("Failed") ? (
                <span className="mt-1 block text-xs">
                  Make sure the API is running:{" "}
                  <code className="text-foreground">
                    {process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1"}
                  </code>
                </span>
              ) : null}
            </p>
          )}
          <Button type="submit" className="w-full" size="lg" isLoading={isLoggingIn}>
            Sign In
          </Button>
        </form>
        <p className="mt-4 text-center text-xs text-muted">
          Customer ordering?{" "}
          <Link href="/" className="text-primary hover:underline">
            Go to menu
          </Link>
          {" · "}
          New tenant?{" "}
          <Link href="/ops/get-started" className="text-primary hover:underline">
            Get started
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
