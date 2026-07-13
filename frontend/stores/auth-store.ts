import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { User } from "@/lib/types";
import { setAuthToken, setTenantId, setTenantSlug } from "@/lib/api-client";

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

type PersistedAuth = {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
};

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
        setTenantSlug(user.tenant_slug ?? null);
        set({ user, token, isAuthenticated: true, hasHydrated: true });
      },
      clearAuth: () => {
        setAuthToken(null);
        setTenantId(null);
        setTenantSlug(null);
        set({ user: null, token: null, isAuthenticated: false });
      },
      setUser: (user) => set({ user }),
    }),
    {
      name: "khayaos-auth",
      version: 2,
      storage: createJSONStorage(() => localStorage),
      partialize: (state): PersistedAuth => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
      migrate: (persisted): PersistedAuth => {
        const state = (persisted ?? {}) as Record<string, unknown>;
        return {
          user: (state.user as User | null) ?? null,
          token: (state.token as string | null) ?? null,
          isAuthenticated: Boolean(state.isAuthenticated),
        };
      },
      merge: (persisted, current) => {
        const incoming = (persisted ?? {}) as Partial<PersistedAuth>;
        return {
          ...current,
          user: incoming.user ?? current.user,
          token: incoming.token ?? current.token,
          isAuthenticated: incoming.isAuthenticated ?? current.isAuthenticated,
          // Never restore hasHydrated from storage (stale false caused endless spinners).
          hasHydrated: current.hasHydrated,
        };
      },
      onRehydrateStorage: () => (state, error) => {
        if (error) {
          useAuthStore.setState({ hasHydrated: true });
          return;
        }
        if (state?.token) setAuthToken(state.token);
        setTenantId(state?.user?.tenant_id ?? null);
        setTenantSlug(state?.user?.tenant_slug ?? null);
        useAuthStore.setState({ hasHydrated: true });
      },
    },
  ),
);
