import { Suspense } from 'react';
import { SiteHeader } from './site-header';
import { SiteFooter } from './site-footer';
import { MobileBottomNav } from './mobile-bottom-nav';
import { AppSidebar, SidebarDrawer } from './app-sidebar';
import { CartDrawer } from '@/components/cart/cart-drawer';

export function CustomerLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <div className="flex flex-1">
        {/* the sidebar reads the URL (active links, filters), hence the Suspense boundary */}
        <Suspense fallback={<div className="hidden w-64 shrink-0 border-r border-border md:block" />}>
          <AppSidebar />
        </Suspense>
        <div className="flex min-w-0 flex-1 flex-col">
          <main className="flex-1 pb-16 md:pb-0">{children}</main>
          <SiteFooter />
        </div>
      </div>
      <MobileBottomNav />
      <CartDrawer />
      <Suspense fallback={null}>
        <SidebarDrawer />
      </Suspense>
    </div>
  );
}
