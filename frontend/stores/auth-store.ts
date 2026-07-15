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

function normalizePersisted(persisted: unknown): PersistedAuth {
  const state = (persisted ?? {}) as Record<string, unknown>;
  const user = (state.user as User | null) ?? null;
  const token = (state.token as string | null) ?? null;
  return {
    user,
    token,
    // Token is the source of truth — older blobs sometimes omitted isAuthenticated.
    isAuthenticated: Boolean(token),
  };
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      // false until client rehydrate finishes (see AuthHydration + skipHydration).
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
      version: 3,
      // Critical for Next.js: do not rehydrate during SSR (marks hydrated with empty auth
      // and then skips client restore — which caused endless admin/platform spinners).
      skipHydration: true,
      storage: createJSONStorage(() => localStorage),
      partialize: (state): PersistedAuth => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
      migrate: (persisted): PersistedAuth => normalizePersisted(persisted),
      merge: (persisted, current) => {
        const incoming = normalizePersisted(persisted);
        return {
          ...current,
          user: incoming.user ?? current.user,
          token: incoming.token ?? current.token,
          isAuthenticated: Boolean(incoming.token ?? incoming.isAuthenticated),
          hasHydrated: current.hasHydrated,
        };
      },
      onRehydrateStorage: () => (state, error) => {
        if (error) {
          useAuthStore.setState({ hasHydrated: true });
          return;
        }
        if (state?.token) {
          setAuthToken(state.token);
          if (!state.isAuthenticated) {
            useAuthStore.setState({ isAuthenticated: true });
          }
        }
        if (state?.user) {
          setTenantId(state.user.tenant_id ?? null);
          setTenantSlug(state.user.tenant_slug ?? null);
        }
        useAuthStore.setState({ hasHydrated: true });
      },
    },
  ),
);
