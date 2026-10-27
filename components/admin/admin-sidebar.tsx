'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronLeft, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SITE_NAME } from '@/lib/constants';
import { ADMIN_NAV } from '@/lib/permissions';
import { useAuthStore } from '@/stores/auth.store';
import { useUiStore } from '@/stores/ui.store';
import { ADMIN_NAV_ICONS, FallbackIcon } from './admin-nav-icons';
import { BrandLogo } from '@/components/shared/brand-logo';

/** Collapsible admin sidebar: full width <-> icon rail (remembered). Phones use the top bar menu instead. */
export function AdminSidebar() {
  const pathname = usePathname();
  const role = useAuthStore((s) => s.user?.role);
  const collapsedState = useUiStore((s) => s.isAdminSidebarCollapsed);
  const toggle = useUiStore((s) => s.toggleAdminSidebar);
  const [mounted, setMounted] = useState(false);

  // restore the remembered choice after hydration (keeps server and first client render identical)
  useEffect(() => {
    useUiStore.persist.rehydrate();
    setMounted(true);
  }, []);

  const collapsed = mounted && collapsedState;
  const items = ADMIN_NAV.filter((i) => role && i.roles.includes(role));

  return (
    <aside
      aria-label="Admin sidebar"
      className={cn(
        'sticky top-0 hidden h-screen shrink-0 flex-col border-r border-border bg-card transition-[width] duration-200 md:flex',
        collapsed ? 'w-16' : 'w-60'
      )}
    >
      <div className={cn('flex h-16 items-center border-b border-border', collapsed ? 'justify-center' : 'gap-2 px-5')}>
        {!collapsed && (
          <>
            <BrandLogo size={32} />
            <span className="font-display text-lg font-semibold">{SITE_NAME}</span>
            <span className="ml-auto text-xs text-muted-foreground">Admin</span>
          </>
        )}
        <button
          type="button"
          onClick={toggle}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-expanded={!collapsed}
          className={cn('flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground', !collapsed && 'ml-1')}
        >
          {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto overflow-x-hidden py-3" aria-label="Admin">
        {items.map((item) => {
          const isActive = item.href === '/admin' ? pathname === '/admin' : pathname.startsWith(item.href);
          const Icon = ADMIN_NAV_ICONS[item.href] ?? FallbackIcon;
          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? item.label : undefined}
              aria-label={collapsed ? item.label : undefined}
              aria-current={isActive ? 'page' : undefined}
              className={cn(
                'flex items-center py-2.5 text-sm transition-colors',
                collapsed ? 'justify-center' : 'gap-3 px-5',
                isActive ? 'bg-accent-soft font-medium text-foreground' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      <Link
        href="/"
        title={collapsed ? 'Back to store' : undefined}
        aria-label={collapsed ? 'Back to store' : undefined}
        className={cn('flex items-center border-t border-border py-4 text-sm text-muted-foreground hover:text-foreground', collapsed ? 'justify-center' : 'gap-2 px-5')}
      >
        <ChevronLeft className="h-4 w-4 shrink-0" />
        {!collapsed && 'Back to store'}
      </Link>
    </aside>
  );
}
