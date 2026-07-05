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
import { useAuth } from "@/hooks/useAuth";
import { ApiClientError } from "@/lib/api-client";

const loginSchema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function LoginPageClient() {
  const searchParams = useSearchParams();
  const prefilledEmail = searchParams.get("email") ?? "";
  const { login, isLoading } = useAuth();
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: prefilledEmail, password: "" },
  });

  const onSubmit = async (data: LoginForm) => {
    setError(null);
    try {
      await login(data.email, data.password);
    } catch (err) {
      if (err instanceof ApiClientError) {
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
        <CardTitle className="text-2xl">KhayaOS Admin</CardTitle>
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
          {error && (
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
          <Button type="submit" className="w-full" size="lg" isLoading={isLoading}>
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
          <Link href="/get-started" className="text-primary hover:underline">
            Get started
          </Link>
          {" · "}
          Platform admin?{" "}
          <span className="text-violet-400">admin@khayaos.com</span>
        </p>
      </CardContent>
    </Card>
  );
}
