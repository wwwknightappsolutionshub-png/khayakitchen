"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { authService } from "@/services/auth.service";
import { useAuthStore } from "@/stores/auth-store";
import { OPS_ROUTES } from "@/lib/ops-paths";

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
    mutationFn: ({
      email,
      password,
      tenantSlug,
    }: {
      email: string;
      password: string;
      tenantSlug?: string;
    }) => authService.login(email, password, tenantSlug),
    onSuccess: (data) => {
      setAuth(data.user, data.token);
      queryClient.invalidateQueries({ queryKey: ["auth"] });

      // Hard navigate so admin/platform guards always read persisted token/localStorage.
      // Soft router.push after login raced with boot-gate / chunk recovery reloads.
      let destination = "/";
      if (data.user.role === "super_admin") {
        destination = OPS_ROUTES.platformDashboard;
      } else if (
        data.user.role === "platform_admin" ||
        data.user.role === "platform_support"
      ) {
        destination = OPS_ROUTES.platformInbox;
      } else if (data.user.role === "kitchen") {
        destination = OPS_ROUTES.kitchen;
      } else if (["owner", "manager", "staff"].includes(data.user.role)) {
        destination = OPS_ROUTES.orders;
      }

      if (typeof window !== "undefined") {
        // Ensure persist blob is readable before full page load of the destination.
        try {
          const snap = useAuthStore.getState();
          localStorage.setItem(
            "khayaos-auth",
            JSON.stringify({
              state: {
                user: snap.user,
                token: snap.token,
                isAuthenticated: true,
              },
              version: 3,
            }),
          );
        } catch {
          // persist middleware still wrote when possible
        }
        window.location.assign(destination);
        return;
      }
      router.push(destination);
    },
  });

  const logoutMutation = useMutation({
    mutationFn: () => authService.logout(),
    onSettled: () => {
      clearAuth();
      queryClient.clear();
      router.push(OPS_ROUTES.login);
    },
  });

  const login = useCallback(
    (email: string, password: string, tenantSlug?: string) =>
      loginMutation.mutateAsync({ email, password, tenantSlug }),
    [loginMutation],
  );

  const logout = useCallback(() => logoutMutation.mutate(), [logoutMutation]);

  return {
    user: meQuery.data ?? user,
    isAuthenticated,
    isLoading: meQuery.isLoading || loginMutation.isPending,
    /** Login form should not spin for background /me refreshes. */
    isLoggingIn: loginMutation.isPending,
    login,
    logout,
    loginError: loginMutation.error,
    setUser,
  };
}
