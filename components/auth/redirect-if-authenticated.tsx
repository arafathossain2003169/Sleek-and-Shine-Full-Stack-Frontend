'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/hooks/useAuth';
import { safeRedirect } from '@/lib/utils';

/** Sends people who are already signed in away from /login and /register. */
export function RedirectIfAuthenticated() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!isLoading && isAuthenticated) router.replace(safeRedirect(searchParams.get('redirect')));
  }, [isLoading, isAuthenticated, router, searchParams]);

  return null;
}
