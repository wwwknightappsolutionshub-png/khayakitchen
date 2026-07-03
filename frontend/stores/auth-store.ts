import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { User } from "@/lib/types";
import { setAuthToken, setTenantId } from "@/lib/api-client";

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  hasHydrated: boolean;
  setAuth: (user: User, token: string) => void;
  clearAuth: () => void;
  setUser: (user: User) => void;
  setHasHydrated: (value: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      hasHydrated: false,
      setHasHydrated: (value) => set({ hasHydrated: value }),
      setAuth: (user, token) => {
        setAuthToken(token);
        setTenantId(user.tenant_id ?? null);
        set({ user, token, isAuthenticated: true, hasHydrated: true });
      },
      clearAuth: () => {
        setAuthToken(null);
        setTenantId(null);
        set({ user: null, token: null, isAuthenticated: false });
      },
      setUser: (user) => set({ user }),
    }),
    {
      name: "khayaos-auth",
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => (state) => {
        if (state?.token) setAuthToken(state.token);
        setTenantId(state?.user?.tenant_id ?? null);
        state?.setHasHydrated(true);
      },
    },
  ),
);
