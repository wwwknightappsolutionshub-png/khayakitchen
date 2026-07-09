"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { Button } from "@/components/ui/Button";
import { authService } from "@/services/auth.service";
import { ApiClientError } from "@/lib/api-client";

const resetSchema = z
  .object({
    password: z.string().min(8, "Password must be at least 8 characters"),
    password_confirmation: z.string().min(1, "Confirm your password"),
  })
  .refine((data) => data.password === data.password_confirmation, {
    message: "Passwords do not match",
    path: ["password_confirmation"],
  });

type ResetForm = z.infer<typeof resetSchema>;

export default function ResetPasswordClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const email = searchParams.get("email") ?? "";
  const tenant = searchParams.get("tenant") ?? "";
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetForm>({
    resolver: zodResolver(resetSchema),
    defaultValues: { password: "", password_confirmation: "" },
  });

  const onSubmit = async (data: ResetForm) => {
    if (!token || !email) {
      setError("This reset link is invalid.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await authService.resetPassword(
        email,
        token,
        data.password,
        data.password_confirmation,
        tenant || undefined,
      );
      const loginParams = new URLSearchParams({
        email: response.email,
        tenant: response.tenant_slug ?? tenant,
      });
      router.push(`/login?${loginParams.toString()}`);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Unable to reset password.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="w-full max-w-md animate-fade-in">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">Choose a new password</CardTitle>
        <CardDescription>Enter a strong password for your KhayaOS account.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <PasswordInput
            label="New password"
            autoComplete="new-password"
            error={errors.password?.message}
            {...register("password")}
          />
          <PasswordInput
            label="Confirm password"
            autoComplete="new-password"
            error={errors.password_confirmation?.message}
            {...register("password_confirmation")}
          />
          {error ? (
            <p className="rounded-[var(--radius)] bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>
          ) : null}
          <Button type="submit" className="w-full" size="lg" isLoading={isSubmitting}>
            Reset password
          </Button>
        </form>
        <p className="mt-4 text-center text-xs text-muted">
          <Link href="/forgot-password" className="text-primary hover:underline">
            Request a new reset link
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
