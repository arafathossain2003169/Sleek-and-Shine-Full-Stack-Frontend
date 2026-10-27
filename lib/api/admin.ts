import { apiClient } from './client';
import { AttributeDefinition, Category, Brand } from '@/types/product';
import { AdminOrder } from '@/types/order';
import {
  AdminCustomer, AdminProduct, AuditLog, ContentSection, Coupon, InventoryMovement, InventoryRow, SettingItem, StaffMember,
} from '@/types/admin';

function qs(params: Record<string, unknown>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue;
    search.set(key, String(value));
  }
  const s = search.toString();
  return s ? `?${s}` : '';
}

export interface DashboardStats {
  totalRevenue: number;
  pendingOrders?: number;
  orderCount: number;
  productCount: number;
  lowStockCount: number;
  recentOrders: Array<{
    id: string; order_number: string; status: string; payment_status: string;
    total: number; created_at: string; customer_name: string;
  }>;
  lowStockItems: Array<{
    variant_id: string; variant_name: string; stock_quantity: number;
    product_name: string; product_slug: string;
  }>;
}

export const adminApi = {
  dashboard: {
    stats: () => apiClient.get<DashboardStats>('/admin/dashboard/stats'),
  },

  products: {
    list: (params: Record<string, unknown> = {}) =>
      apiClient.get<{ products: AdminProduct[] }>(`/admin/products${qs(params)}`),
    getById: (id: string) => apiClient.get<{ product: AdminProduct }>(`/admin/products/${id}`),
    create: (input: Record<string, unknown>) =>
      apiClient.post<{ product: AdminProduct }>('/admin/products', input),
    update: (id: string, input: Record<string, unknown>) =>
      apiClient.patch<{ product: AdminProduct }>(`/admin/products/${id}`, input),
    delete: (id: string) => apiClient.delete(`/admin/products/${id}`),
    updateStatus: (id: string, status: string) =>
      apiClient.patch<{ product: AdminProduct }>(`/admin/products/${id}/status`, { status }),
    duplicate: (id: string) =>
      apiClient.post<{ product: AdminProduct }>(`/admin/products/${id}/duplicate`),
    uploadImage: (id: string, file: File, meta: { isMain?: boolean; altText?: string } = {}) => {
      const form = new FormData();
      form.append('image', file);
      if (meta.isMain) form.append('isMain', 'true');
      if (meta.altText) form.append('altText', meta.altText);
      return apiClient.post(`/admin/products/${id}/images`, form, { timeoutMs: 60_000 });
    },
    updateImage: (id: string, imageId: string, input: { altText?: string | null; sortOrder?: number; isMain?: boolean }) =>
      apiClient.patch(`/admin/products/${id}/images/${imageId}`, input),
    deleteImage: (id: string, imageId: string) =>
      apiClient.delete(`/admin/products/${id}/images/${imageId}`),
    createVariant: (id: string, input: Record<string, unknown>) =>
      apiClient.post(`/admin/products/${id}/variants`, input),
    updateVariant: (id: string, variantId: string, input: Record<string, unknown>) =>
      apiClient.patch(`/admin/products/${id}/variants/${variantId}`, input),
    deleteVariant: (id: string, variantId: string) =>
      apiClient.delete(`/admin/products/${id}/variants/${variantId}`),
  },

  attributes: {
    list: () => apiClient.get<{ attributes: AttributeDefinition[] }>('/admin/attributes'),
    create: (input: Record<string, unknown>) => apiClient.post('/admin/attributes', input),
    update: (id: string, input: Record<string, unknown>) =>
      apiClient.patch(`/admin/attributes/${id}`, input),
    delete: (id: string) => apiClient.delete(`/admin/attributes/${id}`),
  },

  categories: {
    list: () => apiClient.get<{ categories: Category[] }>('/admin/categories'),
    create: (input: Record<string, unknown>) => apiClient.post('/admin/categories', input),
    update: (id: string, input: Record<string, unknown>) =>
      apiClient.patch(`/admin/categories/${id}`, input),
    delete: (id: string) => apiClient.delete(`/admin/categories/${id}`),
  },

  brands: {
    list: () => apiClient.get<{ brands: Brand[] }>('/admin/brands'),
    create: (input: Record<string, unknown>) => apiClient.post('/admin/brands', input),
    update: (id: string, input: Record<string, unknown>) =>
      apiClient.patch(`/admin/brands/${id}`, input),
    delete: (id: string) => apiClient.delete(`/admin/brands/${id}`),
  },

  inventory: {
    list: (params: Record<string, unknown> = {}) =>
      apiClient.get<{ inventory: InventoryRow[]; lowStockThreshold: number }>(`/admin/inventory${qs(params)}`),
    lowStock: () => apiClient.get<{ items: InventoryRow[] }>('/admin/inventory/low-stock'),
    movements: (params: Record<string, unknown> = {}) =>
      apiClient.get<{ movements: InventoryMovement[] }>(`/admin/inventory/movements${qs(params)}`),
    adjust: (input: {
      productId: string; variantId: string; newQuantity: number; reason: string; note?: string;
    }) => apiClient.patch('/admin/inventory/adjust', input),
  },

  orders: {
    list: (params: Record<string, unknown> = {}) =>
      apiClient.get<{ orders: AdminOrder[] }>(`/admin/orders${qs(params)}`),
    getById: (id: string) => apiClient.get<{ order: AdminOrder }>(`/admin/orders/${id}`),
    updateStatus: (id: string, status: string, note?: string) =>
      apiClient.patch(`/admin/orders/${id}/status`, { status, note }),
    updatePaymentStatus: (id: string, paymentStatus: string, transactionId?: string) =>
      apiClient.patch(`/admin/orders/${id}/payment-status`, { paymentStatus, transactionId }),
    updateAdminNote: (id: string, note: string) =>
      apiClient.patch(`/admin/orders/${id}/admin-note`, { note }),
  },

  customers: {
    list: (params: Record<string, unknown> = {}) =>
      apiClient.get<{ customers: AdminCustomer[] }>(`/admin/customers${qs(params)}`),
    getById: (id: string) => apiClient.get(`/admin/customers/${id}`),
    updateStatus: (id: string, status: string) =>
      apiClient.patch(`/admin/customers/${id}/status`, { status }),
  },

  coupons: {
    list: () => apiClient.get<{ coupons: Coupon[] }>('/admin/coupons'),
    create: (input: Record<string, unknown>) => apiClient.post('/admin/coupons', input),
    update: (id: string, input: Record<string, unknown>) =>
      apiClient.patch(`/admin/coupons/${id}`, input),
    delete: (id: string) => apiClient.delete(`/admin/coupons/${id}`),
  },

  content: {
    list: () => apiClient.get<{ sections: ContentSection[] }>('/admin/content/homepage'),
    create: (input: Record<string, unknown>) => apiClient.post('/admin/content/homepage', input),
    update: (id: string, input: Record<string, unknown>) =>
      apiClient.patch(`/admin/content/homepage/${id}`, input),
    delete: (id: string) => apiClient.delete(`/admin/content/homepage/${id}`),
  },

  auditLogs: {
    list: (params: Record<string, unknown> = {}) =>
      apiClient.get<{ auditLogs: AuditLog[] }>(`/admin/audit-logs${qs(params)}`),
  },

  staff: {
    list: () => apiClient.get<{ staff: StaffMember[] }>('/admin/staff'),
    /** find ANY account (customers too) so it can be promoted */
    searchUsers: (search: string) =>
      apiClient.get<{ users: StaffMember[] }>(`/admin/staff/users?search=${encodeURIComponent(search)}`),
    create: (input: { name: string; email: string; password: string; role: string }) =>
      apiClient.post('/admin/staff', input),
    /** change role (use 'customer' to remove staff access) and/or block/unblock */
    update: (id: string, input: { role?: string; status?: string }) =>
      apiClient.patch<{ user: StaffMember }>(`/admin/staff/${id}`, input),
  },

  settings: {
    list: () => apiClient.get<{ settings: SettingItem[] }>('/admin/settings'),
    /** number = set override, null = reset to the server default */
    update: (values: Record<string, number | null>) =>
      apiClient.patch<{ settings: SettingItem[] }>('/admin/settings', { values }),
  },
};
