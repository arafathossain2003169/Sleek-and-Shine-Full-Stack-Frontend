import { create } from 'zustand';
import { User } from '@/types/user';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  isLoading: boolean;
  setSession: (user: User, accessToken: string) => void;
  clearSession: () => void;
  setLoading: (loading: boolean) => void;
}

/**
 * Client-side mirror of the authenticated session. The real source of
 * truth is the HttpOnly cookie pair on the backend; this store just
 * avoids re-fetching /auth/me on every render and gives components a
 * synchronous way to check "is someone logged in".
 */
export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
  isLoading: true,
  setSession: (user, accessToken) => set({ user, accessToken, isLoading: false }),
  clearSession: () => set({ user: null, accessToken: null, isLoading: false }),
  setLoading: (loading) => set({ isLoading: loading }),
}));
