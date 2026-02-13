"use client";
import { create } from "zustand";

type UserType = "member" | "admin" | null;

interface AuthState {
  isAuthenticated: boolean;
  userType: UserType;
  login: (type: UserType) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  isAuthenticated: false,
  userType: null,
  login: (type) => set({ isAuthenticated: true, userType: type }),
  logout: () => set({ isAuthenticated: false, userType: null }),
}));
