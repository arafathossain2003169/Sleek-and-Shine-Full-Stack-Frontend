import { ProductDetail } from './product';

export interface Paginated<T> {
  items: T[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

/** Product as returned to staff (adds internal fields). */
export interface AdminProduct extends ProductDetail {
  sku?: string | null;
  barcode?: string | null;
  status: 'draft' | 'published' | 'hidden' | 'archived';
  totalStock?: number;
}

export interface InventoryRow {
  variant_id: string;
  variant_name: string;
  sku: string | null;
  stock_quantity: number;
  status: string;
  product_id: string;
  product_name: string;
  product_slug: string;
  stock_status: string;
}

export interface InventoryMovement {
  id: string;
  product_name: string;
  variant_name: string | null;
  previous_quantity: number;
  new_quantity: number;
  change_quantity: number;
  reason: string;
  note: string | null;
  admin_name: string | null;
  created_at: string;
}

export interface AdminCustomer {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  status: 'active' | 'blocked' | 'deleted';
  created_at: string;
}

export interface Coupon {
  id: string;
  code: string;
  type: 'percentage' | 'fixed';
  value: string | number;
  min_order_amount: string | number | null;
  max_discount: string | number | null;
  starts_at: string | null;
  ends_at: string | null;
  usage_limit: number | null;
  per_user_limit: number | null;
  used_count: number;
  is_active: boolean;
}

export interface ContentSection {
  id: string;
  type: 'hero' | 'banner' | 'offer' | 'new_arrival' | 'featured_category' | 'custom';
  title: string;
  subtitle: string | null;
  image_url: string | null;
  button_text: string | null;
  button_link: string | null;
  data: Record<string, unknown>;
  sort_order: number;
  is_active: boolean;
  starts_at: string | null;
  ends_at: string | null;
}

export interface AuditLog {
  id: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  old_value: unknown;
  new_value: unknown;
  ip_address: string | null;
  created_at: string;
  admin_name: string | null;
  admin_email: string | null;
}

export interface StaffMember {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: string;
  status: 'active' | 'blocked' | 'deleted';
  email_verified?: boolean;
  created_at: string;
}

export interface SettingItem {
  key: string;
  group: 'Shipping' | 'Inventory' | 'Security';
  label: string;
  description: string;
  kind: 'money' | 'integer';
  min: number;
  max: number;
  step: number;
  value: number;
  defaultValue: number;
  isCustom: boolean;
  updatedAt: string | null;
}
