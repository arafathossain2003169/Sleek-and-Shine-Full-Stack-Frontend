import { UserRole } from '@/types/user';

/**
 * Mirrors the backend permission matrix (the API enforces it; this only decides what the UI shows).
 * The backend remains the source of truth - hiding a link is a courtesy, not security.
 */
export const ADMIN_ROLES: UserRole[] = ['admin', 'manager', 'inventory_staff', 'order_manager', 'super_admin'];

const CATALOG: UserRole[] = ['admin', 'manager', 'super_admin'];
const ORDERS: UserRole[] = ['admin', 'manager', 'order_manager', 'super_admin'];

export interface AdminNavEntry {
  href: string;
  label: string;
  icon: string;
  roles: UserRole[];
}

export const ADMIN_NAV: AdminNavEntry[] = [
  { href: '/admin', label: 'Dashboard', icon: 'LayoutDashboard', roles: ADMIN_ROLES },
  { href: '/admin/orders', label: 'Orders', icon: 'ShoppingCart', roles: ORDERS },
  { href: '/admin/products', label: 'Products', icon: 'Package', roles: ADMIN_ROLES },
  { href: '/admin/inventory', label: 'Inventory', icon: 'Warehouse', roles: ADMIN_ROLES },
  { href: '/admin/categories', label: 'Categories', icon: 'FolderTree', roles: ADMIN_ROLES },
  { href: '/admin/brands', label: 'Brands', icon: 'Tag', roles: ADMIN_ROLES },
  { href: '/admin/attributes', label: 'Attributes', icon: 'SlidersHorizontal', roles: ADMIN_ROLES },
  { href: '/admin/customers', label: 'Customers', icon: 'Users', roles: ORDERS },
  { href: '/admin/coupons', label: 'Coupons', icon: 'Ticket', roles: CATALOG },
  { href: '/admin/content', label: 'Homepage', icon: 'Image', roles: CATALOG },
  { href: '/admin/audit-logs', label: 'Audit Logs', icon: 'ScrollText', roles: CATALOG },
  { href: '/admin/staff', label: 'Staff & roles', icon: 'UserCog', roles: ['admin', 'super_admin'] },
  { href: '/admin/settings', label: 'Settings', icon: 'Settings', roles: ['admin', 'super_admin'] },
];

export function canWriteCatalog(role?: UserRole | null) {
  return !!role && CATALOG.includes(role);
}

/** Roles allowed on an admin URL (the longest matching nav entry wins). */
export function rolesForAdminPath(pathname: string): UserRole[] {
  const entry = [...ADMIN_NAV]
    .filter((e) => (e.href === '/admin' ? pathname === '/admin' : pathname.startsWith(e.href)))
    .sort((a, b) => b.href.length - a.href.length)[0];
  return entry?.roles ?? ADMIN_ROLES;
}
