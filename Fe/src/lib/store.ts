"use client";

import { create } from "zustand";
import type { User, UserProfile } from "./types";
import { authApi, clearToken, setToken } from "./api";

interface AuthState {
  user: User | null;
  profile: UserProfile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => void;
  loadUser: () => Promise<void>;
  setProfile: (profile: UserProfile) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  profile: null,
  isLoading: true,
  isAuthenticated: false,

  login: async (email, password) => {
    const { token, user } = await authApi.login({ email, password });
    setToken(token);
    set({ user, isAuthenticated: true });
  },

  register: async (email, password, name) => {
    const { token, user } = await authApi.register({ email, password, name });
    setToken(token);
    set({ user, isAuthenticated: true });
  },

  logout: () => {
    clearToken();
    set({ user: null, profile: null, isAuthenticated: false });
  },

  loadUser: async () => {
    try {
      const token =
        typeof window !== "undefined" ? localStorage.getItem("pc_token") : null;
      if (!token) {
        set({ isLoading: false, isAuthenticated: false });
        return;
      }
      const user = await authApi.me();
      set({ user, isAuthenticated: true, isLoading: false });
    } catch {
      clearToken();
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  },

  setProfile: (profile) => set({ profile }),
}));

interface UIState {
  sidebarOpen: boolean;
  searchOpen: boolean;
  toggleSidebar: () => void;
  setSearchOpen: (open: boolean) => void;
}

export const useUIStore = create<UIState>((set) => ({
  sidebarOpen: true,
  searchOpen: false,
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setSearchOpen: (open) => set({ searchOpen: open }),
}));
