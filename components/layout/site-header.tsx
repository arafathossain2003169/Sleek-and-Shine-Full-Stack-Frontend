'use client';

import Link from 'next/link';
import { Suspense, useState } from 'react';
import { Search, ShoppingBag, User, Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { HeaderSearch } from './header-search';
import { ThemeToggle } from '@/components/shared/theme-toggle';
import { useUiStore } from '@/stores/ui.store';
import { useCart } from '@/lib/hooks/useCart';
import { useAuth } from '@/lib/hooks/useAuth';
import { SITE_NAME } from '@/lib/constants';
import { ADMIN_ROLES } from '@/lib/permissions';
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { BrandLogo } from '@/components/shared/brand-logo';

export function SiteHeader() {
  const openCart = useUiStore((s) => s.openCart);
  const openSidebarDrawer = useUiStore((s) => s.openSidebarDrawer);
  const { cart } = useCart();
  const { user, isAuthenticated, logout } = useAuth();
  const [searchOpen, setSearchOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 h-16 border-b border-border bg-background/95 backdrop-blur">
      <div className="container flex h-16 items-center gap-4">
        <button
          className="flex items-center justify-center md:hidden"
          onClick={openSidebarDrawer}
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </button>

        <Link href="/" className="flex items-center gap-2 shrink-0">
          <BrandLogo size={36} />
          <span className="font-display text-xl font-semibold tracking-tight">{SITE_NAME}</span>
        </Link>

        <Suspense fallback={<div className="hidden flex-1 md:block" />}>
          <HeaderSearch open={searchOpen} onClose={() => setSearchOpen(false)} />
        </Suspense>

        <div className="ml-auto flex items-center gap-1">
          <Button variant="ghost" size="icon" className="md:hidden" aria-label="Search" aria-expanded={searchOpen} onClick={() => setSearchOpen((o) => !o)}>
            <Search className="h-5 w-5" />
          </Button>

          <ThemeToggle />

          {isAuthenticated ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Account menu" className="hidden md:inline-flex">
                  <User className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <div className="px-2 py-1.5 text-sm font-medium">{user?.name}</div>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/account">My Account</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/account/orders">My Orders</Link>
                </DropdownMenuItem>
                {user && ADMIN_ROLES.includes(user.role) && (
                  <DropdownMenuItem asChild>
                    <Link href="/admin">Admin Dashboard</Link>
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => logout()}>Log out</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Link href="/login" className="hidden md:inline-flex">
              <Button variant="ghost" size="icon" aria-label="Log in">
                <User className="h-5 w-5" />
              </Button>
            </Link>
          )}

          <Button variant="ghost" size="icon" aria-label="Open cart" className="relative" onClick={openCart}>
            <ShoppingBag className="h-5 w-5" />
            {cart.itemCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-accent text-[10px] font-medium text-accent-foreground">
                {cart.itemCount > 9 ? '9+' : cart.itemCount}
              </span>
            )}
          </Button>
        </div>
      </div>
    </header>
  );
}
