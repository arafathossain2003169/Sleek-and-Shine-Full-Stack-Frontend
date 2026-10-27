export type UserRole =
  | 'customer' | 'admin' | 'manager' | 'inventory_staff' | 'order_manager' | 'super_admin';

export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  role: UserRole;
  emailVerified: boolean;
  status: 'active' | 'blocked' | 'deleted';
  createdAt: string;
}

export interface Address {
  id: string;
  user_id: string;
  full_name: string;
  phone: string;
  address_line_1: string;
  address_line_2?: string | null;
  city: string;
  zone?: string | null;
  postal_code?: string | null;
  country: string;
  is_default: boolean;
}
