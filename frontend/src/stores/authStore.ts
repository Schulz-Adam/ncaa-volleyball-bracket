import { create } from 'zustand';
import { authService } from '../services/authService';
import type { User, SignupData, LoginData } from '../types/auth';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  // Actions
  signup: (data: SignupData) => Promise<void>;
  login: (data: LoginData) => Promise<void>;
  logout: () => void;
  clearError: () => void;
  initAuth: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,

  signup: async (data: SignupData) => {
    set({ isLoading: true, error: null });
    try {
      const response = await authService.signup(data);
      set({
        user: response.user,
        isAuthenticated: true,
        isLoading: false,
        error: null
      });
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || 'Signup failed';
      set({
        error: errorMessage,
        isLoading: false,
        isAuthenticated: false,
        user: null
      });
      throw error;
    }
  },

  login: async (data: LoginData) => {
    set({ isLoading: true, error: null });
    try {
      const response = await authService.login(data);
      set({
        user: response.user,
        isAuthenticated: true,
        isLoading: false,
        error: null
      });
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || 'Login failed';
      set({
        error: errorMessage,
        isLoading: false,
        isAuthenticated: false,
        user: null
      });
      throw error;
    }
  },

  logout: () => {
    authService.logout();
    set({
      user: null,
      isAuthenticated: false,
      error: null
    });
  },

  clearError: () => {
    set({ error: null });
  },

  initAuth: () => {
    const user = authService.getStoredUser();
    const isAuthenticated = authService.isAuthenticated();
    set({ user, isAuthenticated });
  },
}));
