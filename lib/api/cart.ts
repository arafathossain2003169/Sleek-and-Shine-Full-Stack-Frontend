import { apiClient } from './client';
import { Cart } from '@/types/order';

export const cartApi = {
  get: () => apiClient.get<{ cart: Cart }>('/cart'),

  sync: (items: { productId: string; variantId?: string | null; quantity: number }[]) =>
    apiClient.post<{ cart: Cart; skipped: { productId: string; reason: string }[] }>('/cart/sync', { items }),

  addItem: (input: { productId: string; variantId?: string | null; quantity: number }) =>
    apiClient.post<{ cart: Cart }>('/cart/items', input),

  updateItem: (itemId: string, quantity: number) =>
    apiClient.patch<{ cart: Cart }>(`/cart/items/${itemId}`, { quantity }),

  removeItem: (itemId: string) => apiClient.delete<{ cart: Cart }>(`/cart/items/${itemId}`),

  clear: () => apiClient.delete<{ cart: Cart }>('/cart'),
};
