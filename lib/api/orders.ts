import { apiClient } from './client';
import { CheckoutQuote, Order } from '@/types/order';
import { Address, User } from '@/types/user';

export const ordersApi = {
  listMy: (params: { page?: number; limit?: number } = {}) => {
    const search = new URLSearchParams();
    if (params.page) search.set('page', String(params.page));
    if (params.limit) search.set('limit', String(params.limit));
    const qs = search.toString();
    return apiClient.get<{ orders: Order[] }>(`/orders/my${qs ? `?${qs}` : ''}`);
  },

  getMy: (orderNumber: string) => apiClient.get<{ order: Order }>(`/orders/my/${orderNumber}`),

  cancelMy: (orderNumber: string) =>
    apiClient.post<{ order: Order }>(`/orders/my/${orderNumber}/cancel`),
};

export type AddressInput = Omit<Address, 'id' | 'user_id'>;

function addressPayload(input: Partial<AddressInput>) {
  return {
    fullName: input.full_name,
    phone: input.phone,
    addressLine1: input.address_line_1,
    addressLine2: input.address_line_2 === '' ? null : input.address_line_2,
    city: input.city,
    zone: input.zone === '' ? null : input.zone,
    postalCode: input.postal_code === '' ? null : input.postal_code,
    country: input.country,
    isDefault: input.is_default,
  };
}

export const usersApi = {
  me: () => apiClient.get<{ user: User }>('/users/me'),
  updateMe: (input: { name?: string; phone?: string | null }) =>
    apiClient.patch<{ user: User }>('/users/me', input),
  listAddresses: () => apiClient.get<{ addresses: Address[] }>('/users/me/addresses'),
  createAddress: (input: AddressInput) =>
    apiClient.post<{ address: Address }>('/users/me/addresses', addressPayload(input)),
  updateAddress: (id: string, input: Partial<AddressInput>) =>
    apiClient.patch<{ address: Address }>(`/users/me/addresses/${id}`, addressPayload(input)),
  deleteAddress: (id: string) => apiClient.delete(`/users/me/addresses/${id}`),
};

export interface CheckoutOrderResult {
  id: string;
  orderNumber: string;
  status: string;
  paymentStatus: string;
  paymentProvider: string;
  subtotal: number;
  discountTotal: number;
  deliveryFee: number;
  total: number;
  currency: string;
  createdAt: string;
}

export const checkoutApi = {
  /** Server-authoritative totals (shipping, coupon discount). Never compute these on the client. */
  quote: (couponCode?: string) =>
    apiClient.post<{ quote: CheckoutQuote }>('/checkout/quote', couponCode ? { couponCode } : {}),

  placeOrder: (input: {
    addressId: string;
    couponCode?: string;
    paymentProvider: string;
    customerNote?: string;
  }) => apiClient.post<{ order: CheckoutOrderResult }>('/checkout', input),
};

export const couponsApi = {
  validate: (code: string, orderAmount: number) =>
    apiClient.post<{
      coupon: { code: string; type: string; value: number; discount: number; newTotal: number };
    }>('/coupons/validate', { code, orderAmount }),
};
