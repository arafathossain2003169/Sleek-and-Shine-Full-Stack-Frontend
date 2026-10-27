'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import {
  ChevronDown, ChevronRight, Flame, Home, LayoutGrid, LogIn, Package, PanelLeftClose, PanelLeftOpen, Sparkles,
  Store, User, SlidersHorizontal,
} from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { SidebarFilters, activeFilterCount, isCatalogPath } from '@/components/products/sidebar-filters';
import { useCategoryTree } from '@/lib/hooks/useCategories';
import { useAuth } from '@/lib/hooks/useAuth';
import { useUiStore } from '@/stores/ui.store';
import { CategoryTreeNode } from '@/types/product';
import { cn } from '@/lib/utils';

function useIsActive() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  return (href: string) => {
    const [path, query] = href.split('?');
    if (path !== pathname) return false;
    if (!query) {
      // "Shop" is active only for the unflagged catalog
      return path !== '/shop' || (!searchParams.get('isNewArrival') && !searchParams.get('isOffer'));
    }
    const [k, v] = query.split('=');
    return searchParams.get(k) === v;
  };
}

interface RowProps {
  href?: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  collapsed: boolean;
  active?: boolean;
  onClick?: () => void;
  badge?: number;
}

/** One nav row: icon + label when expanded, icon only (with a tooltip) in the collapsed rail. */
function Row({ href, icon: Icon, label, collapsed, active, onClick, badge }: RowProps) {
  const className = cn(
    'group relative flex h-9 items-center gap-3 rounded-md px-3 text-sm transition-colors',
    collapsed && 'justify-center px-0',
    active ? 'bg-accent-soft font-medium text-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
  );
  const content = (
    <>
      <Icon className="h-4 w-4 shrink-0" />
      {!collapsed && <span className="truncate">{label}</span>}
      {!!badge && (
        <span className={cn('flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-medium text-accent-foreground', collapsed ? 'absolute right-1 top-1' : 'ml-auto')}>
          {badge}
        </span>
      )}
    </>
  );
  return href ? (
    <Link href={href} title={collapsed ? label : undefined} aria-label={collapsed ? label : undefined} aria-current={active ? 'page' : undefined} onClick={onClick} className={className}>
      {content}
    </Link>
  ) : (
    <button type="button" title={collapsed ? label : undefined} aria-label={collapsed ? label : undefined} onClick={onClick} className={className}>
      {content}
    </button>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="px-3 pb-1 pt-4 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{children}</h2>;
}

function CategoryItem({ node, depth, pathname, onNavigate }: { node: CategoryTreeNode; depth: number; pathname: string; onNavigate?: () => void }) {
  const href = `/categories/${node.slug}`;
  const active = pathname === href;
  const hasChildren = node.children.length > 0;
  const containsActive = (n: CategoryTreeNode): boolean => pathname === `/categories/${n.slug}` || n.children.some(containsActive);
  const [open, setOpen] = useState(() => containsActive(node));

  return (
    <li>
      <div className={cn('flex items-center rounded-md', active ? 'bg-accent-soft' : 'hover:bg-muted')}>
        <Link
          href={href}
          onClick={onNavigate}
          aria-current={active ? 'page' : undefined}
          className={cn('flex-1 truncate py-1.5 pr-1 text-sm', depth === 0 ? 'pl-3' : 'pl-2 text-muted-foreground', active && 'font-medium text-foreground')}
        >
          {node.name}
        </Link>
        {hasChildren && (
          <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-label={`${open ? 'Collapse' : 'Expand'} ${node.name}`} className="px-2 text-muted-foreground">
            {open ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
          </button>
        )}
      </div>
      {open && hasChildren && (
        <ul className="ml-3 border-l border-border pl-1">
          {node.children.map((c) => <CategoryItem key={c.id} node={c} depth={depth + 1} pathname={pathname} onNavigate={onNavigate} />)}
        </ul>
      )}
    </li>
  );
}

/** Everything inside the sidebar; shared by the desktop rail and the mobile drawer. */
export function SidebarBody({ collapsed, onNavigate }: { collapsed: boolean; onNavigate?: () => void }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isActive = useIsActive();
  const expand = useUiStore((s) => s.expandSidebar);
  const { data: categories, isLoading } = useCategoryTree();
  const { user, isAuthenticated } = useAuth();
  const onCatalog = isCatalogPath(pathname);
  const filterCount = activeFilterCount(new URLSearchParams(searchParams.toString()));

  return (
    <nav aria-label="Store navigation" className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto overflow-x-hidden px-2 pb-3">
      <Row href="/" icon={Home} label="Home" collapsed={collapsed} active={isActive('/')} onClick={onNavigate} />
      <Row href="/shop" icon={Store} label="Shop all" collapsed={collapsed} active={isActive('/shop')} onClick={onNavigate} />
      <Row href="/shop?isNewArrival=true" icon={Sparkles} label="New arrivals" collapsed={collapsed} active={isActive('/shop?isNewArrival=true')} onClick={onNavigate} />
      <Row href="/shop?isOffer=true" icon={Flame} label="Offers" collapsed={collapsed} active={isActive('/shop?isOffer=true')} onClick={onNavigate} />

      {collapsed ? (
        <>
          <div className="my-2 h-px bg-border" />
          <Row icon={LayoutGrid} label="Categories" collapsed onClick={expand} />
          {onCatalog && <Row icon={SlidersHorizontal} label="Filters" collapsed onClick={expand} badge={filterCount || undefined} />}
        </>
      ) : (
        <>
          <SectionTitle>Categories</SectionTitle>
          {isLoading ? (
            <div className="space-y-2 px-3 py-1">{[1, 2, 3, 4].map((i) => <div key={i} className="h-4 animate-pulse rounded bg-muted" />)}</div>
          ) : (
            <ul>
              {categories?.map((c) => <CategoryItem key={c.id} node={c} depth={0} pathname={pathname} onNavigate={onNavigate} />)}
              {categories?.length === 0 && <li className="px-3 py-1 text-sm text-muted-foreground">No categories yet.</li>}
            </ul>
          )}

          {onCatalog && (
            <>
              <SectionTitle>Filters</SectionTitle>
              <div className="px-3 pb-2"><SidebarFilters /></div>
            </>
          )}
        </>
      )}

      <div className="mt-auto pt-3">
        <div className="mb-2 h-px bg-border" />
        {isAuthenticated ? (
          <>
            <Row href="/account/orders" icon={Package} label="My orders" collapsed={collapsed} active={pathname.startsWith('/account/orders')} onClick={onNavigate} />
            <Row href="/account" icon={User} label={user?.name ?? 'Account'} collapsed={collapsed} active={pathname === '/account'} onClick={onNavigate} />
          </>
        ) : (
          <Row href="/login" icon={LogIn} label="Log in / Sign up" collapsed={collapsed} active={pathname === '/login' || pathname === '/register'} onClick={onNavigate} />
        )}
      </div>
    </nav>
  );
}

/** Desktop: collapsible left sidebar (icon rail <-> full), present on every storefront page. */
export function AppSidebar() {
  const collapsed = useUiStore((s) => s.isSidebarCollapsed);
  const toggle = useUiStore((s) => s.toggleSidebar);
  const [mounted, setMounted] = useState(false);

  // restore the remembered collapsed/expanded choice after hydration
  useEffect(() => {
    useUiStore.persist.rehydrate();
    setMounted(true);
  }, []);

  const isCollapsed = mounted && collapsed;

  return (
    <aside
      aria-label="Sidebar"
      className={cn(
        'sticky top-16 hidden h-[calc(100vh-4rem)] shrink-0 flex-col border-r border-border bg-background transition-[width] duration-200 md:flex',
        isCollapsed ? 'w-14' : 'w-64'
      )}
    >
      <div className={cn('flex h-12 items-center px-2', isCollapsed ? 'justify-center' : 'justify-between')}>
        {!isCollapsed && <span className="px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Browse</span>}
        <button
          type="button"
          onClick={toggle}
          aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-expanded={!isCollapsed}
          className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          {isCollapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
        </button>
      </div>
      <SidebarBody collapsed={isCollapsed} />
    </aside>
  );
}

/** Mobile: the same sidebar as a slide-over drawer opened from the header / bottom bar. */
export function SidebarDrawer() {
  const open = useUiStore((s) => s.isSidebarDrawerOpen);
  const close = useUiStore((s) => s.closeSidebarDrawer);
  const pathname = usePathname();

  // close after navigating
  useEffect(() => { close(); }, [pathname, close]);

  return (
    <Sheet open={open} onOpenChange={(o) => !o && close()}>
      <SheetContent side="left" className="max-w-[18rem] p-0 md:hidden">
        <SheetHeader className="px-4 pt-4">
          <SheetTitle>Browse</SheetTitle>
          <SheetDescription className="sr-only">Categories, filters and account links</SheetDescription>
        </SheetHeader>
        <SidebarBody collapsed={false} onNavigate={close} />
      </SheetContent>
    </Sheet>
  );
}
