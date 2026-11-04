"use client";
import { useSyncExternalStore } from "react";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export type UserType = "member" | "admin";

export interface AuthUser {
  name: string;
  email: string;
  role: string;
  sv?: string;
}

interface AuthState {
  isAuthenticated: boolean;
  userType: UserType | null;
  user: AuthUser | null;
  login: (type: UserType, user: AuthUser) => void;
  logout: () => void;
  updateUser: (patch: Partial<AuthUser>) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      isAuthenticated: false,
      userType: null,
      user: null,
      login: (type, user) => set({ isAuthenticated: true, userType: type, user }),
      logout: () => set({ isAuthenticated: false, userType: null, user: null }),
      updateUser: (patch) => set((s) => (s.user ? { user: { ...s.user, ...patch } } : {})),
    }),
    {
      name: "silvervibe_auth",
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ isAuthenticated: s.isAuthenticated, userType: s.userType, user: s.user }),
    }
  )
);

/**
 * true once the persisted session has been read from localStorage (always false
 * during SSR). Guards wait for this before deciding to redirect.
 */
export function useAuthHydrated(): boolean {
  return useSyncExternalStore(
    (cb) => useAuthStore.persist.onFinishHydration(cb),
    () => useAuthStore.persist.hasHydrated(),
    () => false
  );
}
