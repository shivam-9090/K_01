import { create } from "zustand";
import { User } from "../types";
import { authService } from "../services/auth.service";
import { queryClient } from "../lib/query-client";

const getInitialAuthState = () => {
  const accessToken = localStorage.getItem("accessToken");
  const userStr = localStorage.getItem("user");

  if (!accessToken || !userStr) {
    return {
      user: null as User | null,
      accessToken: null as string | null,
      isAuthenticated: false,
    };
  }

  try {
    const user = JSON.parse(userStr) as User;
    return {
      user,
      accessToken,
      isAuthenticated: true,
    };
  } catch {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("user");

    return {
      user: null as User | null,
      accessToken: null as string | null,
      isAuthenticated: false,
    };
  }
};

const initialAuth = getInitialAuthState();

interface AuthState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  loadUserFromStorage: () => void;
  updateUser: (user: User) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: initialAuth.user,
  accessToken: initialAuth.accessToken,
  isAuthenticated: initialAuth.isAuthenticated,
  isLoading: false,

  login: async (email: string, password: string) => {
    set({ isLoading: true });
    try {
      const response: any = await authService.login({
        email,
        password,
      });

      // Check if 2FA is required - if so, don't save anything yet
      if (response.requiresTwoFA) {
        set({ isLoading: false });
        // Re-throw so the calling component can handle the 2FA redirect
        throw { response: { data: response } };
      }

      // Normal login - save to localStorage AND Zustand store
      localStorage.setItem("accessToken", response.accessToken);
      localStorage.setItem("refreshToken", response.refreshToken);
      localStorage.setItem("user", JSON.stringify(response.user));

      // Clear React Query cache to prevent stale data from previous sessions
      queryClient.clear();

      set({
        user: response.user,
        accessToken: response.accessToken,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (error) {
      set({ isLoading: false });

      // Re-throw to let Login component handle 2FA
      throw error;
    }
  },

  logout: async () => {
    try {
      await authService.logout();
    } finally {
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
      localStorage.removeItem("user");

      // Clear React Query cache on logout
      queryClient.clear();

      set({
        user: null,
        accessToken: null,
        isAuthenticated: false,
      });
    }
  },

  loadUserFromStorage: () => {
    const accessToken = localStorage.getItem("accessToken");
    const userStr = localStorage.getItem("user");

    if (accessToken && userStr) {
      try {
        const user = JSON.parse(userStr);
        set({
          user,
          accessToken,
          isAuthenticated: true,
        });
      } catch (error) {
        localStorage.clear();
      }
    }
  },

  updateUser: (user: User) => {
    const accessToken = localStorage.getItem("accessToken");
    localStorage.setItem("user", JSON.stringify(user));
    set({
      user,
      accessToken,
      isAuthenticated: true,
    });
  },
}));
