'use client';

import { useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { authApi, isChallenge, OtpChallenge, OtpPurpose } from '@/lib/api/auth';
import { ApiError } from '@/lib/api/client';
import { useAuthStore } from '@/stores/auth.store';
import { useGuestCartStore } from '@/stores/cart.store';
import { cartApi } from '@/lib/api/cart';
import { toast } from '@/stores/toast.store';

/**
 * Loads the current session on first mount (if a valid cookie exists). A 401 from /auth/me
 * transparently tries the refresh token first (see apiRequest), so a returning visitor whose
 * 15-minute access token expired is NOT logged out.
 */
export function useAuthBootstrap() {
  const setSession = useAuthStore((s) => s.setSession);
  const clearSession = useAuthStore((s) => s.clearSession);

  useEffect(() => {
    let cancelled = false;
    authApi
      .me()
      .then(({ data }) => {
        if (!cancelled) setSession(data.user, '');
      })
      .catch(() => {
        if (!cancelled) clearSession();
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

export function useAuth() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const isLoading = useAuthStore((s) => s.isLoading);
  const setSession = useAuthStore((s) => s.setSession);
  const clearSession = useAuthStore((s) => s.clearSession);

  /** Merges the guest (localStorage) cart into the account cart, then refreshes the cart view. */
  const syncGuestCart = useCallback(async () => {
    // Read the store directly: a closure over render-time state could be stale right after login.
    const { items, clear } = useGuestCartStore.getState();
    if (items.length === 0) return;
    try {
      const { data } = await cartApi.sync(
        items.map((i) => ({ productId: i.productId, variantId: i.variantId, quantity: i.quantity }))
      );
      clear();
      if (data.skipped?.length) {
        toast({
          title: 'Some items could not be added',
          description: `${data.skipped.length} item(s) from your basket are unavailable or out of stock.`,
        });
      }
    } catch {
      toast({
        title: 'Could not merge your basket',
        description: 'Your previous items are still saved on this device. Please add them again.',
        variant: 'destructive',
      });
    } finally {
      await queryClient.invalidateQueries({ queryKey: ['cart'] });
    }
  }, [queryClient]);

  const afterAuth = useCallback(
    async (nextUser: Parameters<typeof setSession>[0], accessToken: string) => {
      // New identity => drop every cached query from the previous one (cart, addresses, admin data...).
      queryClient.clear();
      setSession(nextUser, accessToken);
      await syncGuestCart();
    },
    [queryClient, setSession, syncGuestCart]
  );

  /**
   * Step 1: check the password. Returns the OTP challenge to show the code screen
   * (the session only starts after verifyOtp succeeds); null means OTP is disabled and the user is already signed in.
   */
  const login = useCallback(
    async (input: { email: string; password: string }): Promise<OtpChallenge | null> => {
      const { data } = await authApi.login(input);
      if (!isChallenge(data)) {
        await afterAuth(data.user, data.accessToken); // OTP switched off on the server
        return null;
      }
      return data;
    },
    [afterAuth]
  );

  const register = useCallback(
    async (input: { name: string; email: string; password: string; phone?: string }): Promise<OtpChallenge | null> => {
      const { data } = await authApi.register(input);
      if (!isChallenge(data)) {
        await afterAuth(data.user, data.accessToken);
        return null;
      }
      return data;
    },
    [afterAuth]
  );

  /** Step 2: the e-mailed code. On success the user is signed in (and the guest cart is merged). */
  const verifyOtp = useCallback(
    async (input: { email: string; purpose: OtpPurpose; code: string }) => {
      const { data } = await authApi.verifyOtp(input);
      await afterAuth(data.user, data.accessToken);
      return data.user;
    },
    [afterAuth]
  );

  const resendOtp = useCallback(
    async (input: { email: string; purpose: OtpPurpose }) => (await authApi.resendOtp(input)).data,
    []
  );

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } finally {
      clearSession();
      queryClient.clear(); // never leave one user's data around for the next login
      router.push('/');
      router.refresh();
    }
  }, [clearSession, queryClient, router]);

  return { user, isLoading, isAuthenticated: !!user, login, register, verifyOtp, resendOtp, logout };
}

export { ApiError };
