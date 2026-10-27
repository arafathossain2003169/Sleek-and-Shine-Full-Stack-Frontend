'use client';

import Link from 'next/link';
import { ADMIN_NAV } from '@/lib/permissions';
import { useAuthStore } from '@/stores/auth.store';
import { ADMIN_NAV_ICONS, FallbackIcon } from './admin-nav-icons';

export function AdminMobileNav({ onClose }: { onClose: () => void }) {
  const role = useAuthStore((s) => s.user?.role);
  const items = ADMIN_NAV.filter((i) => role && i.roles.includes(role));

  return (
    <>
      {/* backdrop: tapping outside the menu closes it */}
      <div className="fixed inset-0 top-16 z-30 bg-black/30 md:hidden" onClick={onClose} aria-hidden="true" />
      <nav
        aria-label="Admin"
        className="absolute inset-x-0 top-16 z-40 max-h-[70vh] overflow-y-auto border-b border-border bg-card shadow-lg md:hidden"
      >
        {items.map((item) => {
          const Icon = ADMIN_NAV_ICONS[item.href] ?? FallbackIcon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className="flex items-center gap-3 border-b border-border px-5 py-3 text-sm last:border-0"
            >
              <Icon className="h-4 w-4" /> {item.label}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
