"use client";

import Link from "next/link";
import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { authService } from "@/services/auth.service";
import { ApiClientError } from "@/lib/api-client";

const forgotSchema = z.object({
  email: z.string().email("Enter a valid email"),
  tenant_slug: z.string().optional(),
});

type ForgotForm = z.infer<typeof forgotSchema>;

export default function ForgotPasswordClient() {
  const searchParams = useSearchParams();
  const prefilledEmail = searchParams.get("email") ?? "";
  const prefilledTenant = searchParams.get("tenant") ?? searchParams.get("tenant_slug") ?? "";
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotForm>({
    resolver: zodResolver(forgotSchema),
    defaultValues: { email: prefilledEmail, tenant_slug: prefilledTenant },
  });

  const onSubmit = async (data: ForgotForm) => {
    setIsSubmitting(true);
    setError(null);
    setMessage(null);

    try {
      const response = await authService.forgotPassword(
        data.email,
        data.tenant_slug?.trim() || undefined,
      );
      setMessage(response.message);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Unable to send reset email.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="w-full max-w-md animate-fade-in">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">Reset password</CardTitle>
        <CardDescription>We will email you a link to choose a new password.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input
            label="Email"
            type="email"
            autoComplete="email"
            error={errors.email?.message}
            {...register("email")}
          />
          <Input
            label="Workspace slug"
            type="text"
            placeholder="your-restaurant"
            tooltip="Required if your email is used in multiple workspaces."
            error={errors.tenant_slug?.message}
            {...register("tenant_slug")}
          />
          {message ? (
            <p className="rounded-[var(--radius)] bg-success/10 px-3 py-2 text-sm text-success">{message}</p>
          ) : null}
          {error ? (
            <p className="rounded-[var(--radius)] bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>
          ) : null}
          <Button type="submit" className="w-full" size="lg" isLoading={isSubmitting}>
            Send reset link
          </Button>
        </form>
        <p className="mt-4 text-center text-xs text-muted">
          <Link href="/login" className="text-primary hover:underline">
            Back to sign in
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
