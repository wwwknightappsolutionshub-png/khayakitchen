"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { authService } from "@/services/auth.service";
import { useAuthStore } from "@/stores/auth-store";

export function useAuth() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user, isAuthenticated, setAuth, clearAuth, setUser } = useAuthStore();

  const meQuery = useQuery({
    queryKey: ["auth", "me"],
    queryFn: () => authService.me(),
    enabled: isAuthenticated,
    retry: false,
  });

  const loginMutation = useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) =>
      authService.login(email, password),
    onSuccess: (data) => {
      setAuth(data.user, data.token);
      queryClient.invalidateQueries({ queryKey: ["auth"] });
      if (data.user.role === "super_admin") {
        router.push("/platform/dashboard");
      } else if (["owner", "manager", "kitchen", "staff"].includes(data.user.role)) {
        router.push("/admin/dashboard");
      } else {
        router.push("/");
      }
    },
  });

  const logoutMutation = useMutation({
    mutationFn: () => authService.logout(),
    onSettled: () => {
      clearAuth();
      queryClient.clear();
      router.push("/login");
    },
  });

  const login = useCallback(
    (email: string, password: string) => loginMutation.mutateAsync({ email, password }),
    [loginMutation],
  );

  const logout = useCallback(() => logoutMutation.mutate(), [logoutMutation]);

  return {
    user: meQuery.data ?? user,
    isAuthenticated,
    isLoading: meQuery.isLoading || loginMutation.isPending,
    login,
    logout,
    loginError: loginMutation.error,
    setUser,
  };
}
