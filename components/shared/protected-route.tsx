'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/lib/hooks/useAuth';
import { UserRole } from '@/types/user';

export function ProtectedRoute({
  children,
  allowedRoles,
}: {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
}) {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) {
      router.replace(`/login?redirect=${encodeURIComponent(pathname)}`);
    }
  }, [isLoading, isAuthenticated, pathname, router]);

  if (isLoading || !isAuthenticated) {
    return <div className="container py-16 text-center text-muted-foreground">Loading...</div>;
  }

  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    return (
      <div className="container py-16 text-center">
        <p className="font-display text-xl font-semibold">You don&apos;t have access to this section</p>
        <p className="mt-2 text-sm text-muted-foreground">Ask a super admin if you need your role changed.</p>
        <Link href="/" className="mt-4 inline-block text-sm text-accent hover:underline">Back to the store</Link>
      </div>
    );
  }

  return <>{children}</>;
}
