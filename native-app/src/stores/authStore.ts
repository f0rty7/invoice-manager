import { create } from 'zustand';
import {
  getStoredToken,
  getStoredUser,
  setStoredToken,
  setStoredUser,
  clearAuthStorage,
} from '../utils/storage';

interface AuthUser {
  id: string;
  username: string;
  role: 'user' | 'admin';
}

interface AuthState {
  token: string | null;
  user: AuthUser | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isLoading: boolean; // true while restoring from secure store

  setAuth: (token: string, user: AuthUser) => Promise<void>;
  logout: () => Promise<void>;
  restoreAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  user: null,
  isAuthenticated: false,
  isAdmin: false,
  isLoading: true,

  setAuth: async (token, user) => {
    await Promise.all([setStoredToken(token), setStoredUser(user)]);
    set({
      token,
      user,
      isAuthenticated: true,
      isAdmin: user.role === 'admin',
      isLoading: false,
    });
  },

  logout: async () => {
    await clearAuthStorage();
    set({
      token: null,
      user: null,
      isAuthenticated: false,
      isAdmin: false,
      isLoading: false,
    });
  },

  restoreAuth: async () => {
    const [token, user] = await Promise.all([getStoredToken(), getStoredUser()]);
    if (token && user) {
      set({
        token,
        user,
        isAuthenticated: true,
        isAdmin: user.role === 'admin',
        isLoading: false,
      });
    } else {
      set({ isLoading: false });
    }
  },
}));
