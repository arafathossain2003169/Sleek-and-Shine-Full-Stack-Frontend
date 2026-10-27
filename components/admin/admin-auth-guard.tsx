'use client';

import { usePathname } from 'next/navigation';
import { ProtectedRoute } from '@/components/shared/protected-route';
import { rolesForAdminPath } from '@/lib/permissions';

export function AdminAuthGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  // Per-section roles: e.g. inventory staff see "no access" on Customers instead of a failing page.
  return <ProtectedRoute allowedRoles={rolesForAdminPath(pathname)}>{children}</ProtectedRoute>;
}
