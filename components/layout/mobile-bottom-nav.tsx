'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, LayoutGrid, Store, ShoppingBag, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUiStore } from '@/stores/ui.store';
import { useCart } from '@/lib/hooks/useCart';

export function MobileBottomNav() {
  const pathname = usePathname();
  const openCart = useUiStore((s) => s.openCart);
  const openSidebarDrawer = useUiStore((s) => s.openSidebarDrawer);
  const { cart } = useCart();

  const items = [
    { label: 'Home', href: '/', icon: Home },
    { label: 'Shop', href: '/shop', icon: Store },
    { label: 'Browse', href: '#browse', icon: LayoutGrid, action: openSidebarDrawer },
    { label: 'Cart', href: '#cart', icon: ShoppingBag, action: openCart, badge: cart.itemCount },
    { label: 'Account', href: '/account', icon: User },
  ];

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 backdrop-blur md:hidden">
      <div className="grid grid-cols-5">
        {items.map((item) => {
          const isActive = item.href.startsWith('/') && pathname === item.href;
          const Icon = item.icon;

          if (item.action) {
            return (
              <button
                key={item.label}
                onClick={item.action}
                className="relative flex flex-col items-center justify-center gap-0.5 py-2 text-muted-foreground"
              >
                <Icon className="h-5 w-5" />
                <span className="text-[10px]">{item.label}</span>
                {!!item.badge && (
                  <span className="absolute right-5 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-accent text-[9px] font-medium text-accent-foreground">
                    {item.badge > 9 ? '9+' : item.badge}
                  </span>
                )}
              </button>
            );
          }

          return (
            <Link
              key={item.label}
              href={item.href}
              className={cn(
                'flex flex-col items-center justify-center gap-0.5 py-2',
                isActive ? 'text-accent' : 'text-muted-foreground'
              )}
            >
              <Icon className="h-5 w-5" />
              <span className="text-[10px]">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
