'use client';

import { useAuthBootstrap } from '@/lib/hooks/useAuth';

/** Fires the session bootstrap hook once at the app root. Renders nothing. */
export function AuthBootstrap() {
  useAuthBootstrap();
  return null;
}
