'use client';

import { useState } from 'react';
import { Menu, X } from 'lucide-react';
import { ThemeToggle } from '@/components/shared/theme-toggle';
import { useAuth } from '@/lib/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { AdminMobileNav } from './admin-mobile-nav';

export function AdminTopbar() {
  const { user, logout } = useAuth();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-border bg-background/95 px-5 backdrop-blur">
      <button className="md:hidden" onClick={() => setMobileNavOpen((o) => !o)} aria-label="Toggle menu">
        {mobileNavOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      <div className="flex-1" />

      <ThemeToggle />
      <div className="hidden text-right sm:block">
        <p className="text-sm font-medium">{user?.name}</p>
        <p className="text-xs capitalize text-muted-foreground">{user?.role.replace('_', ' ')}</p>
      </div>
      <Button variant="outline" size="sm" onClick={() => logout()}>Log out</Button>

      {mobileNavOpen && <AdminMobileNav onClose={() => setMobileNavOpen(false)} />}
    </header>
  );
}
