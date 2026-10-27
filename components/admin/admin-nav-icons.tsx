import {
  LayoutDashboard, Package, Boxes, Tags, Layers, ShoppingCart, Users, Ticket,
  LayoutTemplate, ScrollText, SlidersHorizontal, UserCog, FolderTree, Settings, LucideIcon,
} from 'lucide-react';

// One icon per section (the old nav reused the same icon for Categories and Attributes).
export const ADMIN_NAV_ICONS: Record<string, LucideIcon> = {
  '/admin': LayoutDashboard,
  '/admin/orders': ShoppingCart,
  '/admin/products': Package,
  '/admin/inventory': Boxes,
  '/admin/categories': FolderTree,
  '/admin/brands': Tags,
  '/admin/attributes': SlidersHorizontal,
  '/admin/customers': Users,
  '/admin/coupons': Ticket,
  '/admin/content': LayoutTemplate,
  '/admin/audit-logs': ScrollText,
  '/admin/staff': UserCog,
  '/admin/settings': Settings,
};

export const FallbackIcon = Layers;
