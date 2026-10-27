'use client';

import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { cartApi } from '@/lib/api/cart';
import { useAuthStore } from '@/stores/auth.store';
import { useGuestCartStore, GuestCartItem } from '@/stores/cart.store';
import { Cart } from '@/types/order';

const CART_QUERY_KEY = ['cart'];

function guestCartToCart(items: GuestCartItem[]): Cart {
  return {
    items: items.map((i) => ({
      id: `${i.productId}:${i.variantId ?? 'default'}`,
      productId: i.productId,
      variantId: i.variantId,
      slug: i.slug,
      name: i.name,
      variantName: i.variantName,
      image: i.image,
      price: i.price,
      quantity: i.quantity,
      subtotal: Number((i.price * i.quantity).toFixed(2)),
      stockAvailable: null,
      isAvailable: true,
      warning: null,
    })),
    itemCount: items.reduce((sum, i) => sum + i.quantity, 0),
    subtotal: Number(items.reduce((sum, i) => sum + i.price * i.quantity, 0).toFixed(2)),
    hasIssues: false,
  };
}

/**
 * Single interface for "the cart" regardless of auth state:
 * - Signed out: reads/writes the localStorage guest cart (instant, no network).
 * - Signed in: reads/writes the backend cart via react-query.
 */
const MAX_QTY = 99;

export function useCart() {
  const isAuthenticated = !!useAuthStore((s) => s.user);
  const queryClient = useQueryClient();

  const guestItems = useGuestCartStore((s) => s.items);
  const guestAdd = useGuestCartStore((s) => s.addItem);
  const guestUpdate = useGuestCartStore((s) => s.updateQuantity);
  const guestRemove = useGuestCartStore((s) => s.removeItem);
  const guestClear = useGuestCartStore((s) => s.clear);

  const backendQuery = useQuery({
    queryKey: CART_QUERY_KEY,
    queryFn: async () => (await cartApi.get()).data.cart,
    enabled: isAuthenticated,
    staleTime: 10_000,
  });

  const cart: Cart = isAuthenticated
    ? backendQuery.data ?? { items: [], itemCount: 0, subtotal: 0, hasIssues: false }
    : guestCartToCart(guestItems);

  const invalidate = useCallback(
    () => queryClient.invalidateQueries({ queryKey: CART_QUERY_KEY }),
    [queryClient]
  );

  const addItem = useCallback(
    async (item: {
      productId: string;
      variantId?: string | null;
      slug: string;
      name: string;
      variantName?: string | null;
      image?: string | null;
      price: number;
      quantity: number;
    }) => {
      if (isAuthenticated) {
        try {
          await cartApi.addItem({
            productId: item.productId,
            variantId: item.variantId ?? null,
            quantity: item.quantity,
          });
        } finally {
          invalidate();
        }
      } else {
        guestAdd({
          productId: item.productId,
          variantId: item.variantId ?? null,
          slug: item.slug,
          name: item.name,
          variantName: item.variantName ?? null,
          image: item.image ?? null,
          price: item.price,
          quantity: item.quantity,
        });
      }
    },
    [isAuthenticated, invalidate, guestAdd]
  );

  const updateQuantity = useCallback(
    async (itemId: string, productId: string, variantId: string | null, quantity: number) => {
      if (isAuthenticated) {
        try {
          await cartApi.updateItem(itemId, Math.min(quantity, MAX_QTY));
        } finally {
          invalidate();
        }
      } else {
        guestUpdate(productId, variantId, Math.min(quantity, MAX_QTY));
      }
    },
    [isAuthenticated, invalidate, guestUpdate]
  );

  const removeItem = useCallback(
    async (itemId: string, productId: string, variantId: string | null) => {
      if (isAuthenticated) {
        try {
          await cartApi.removeItem(itemId);
        } finally {
          invalidate();
        }
      } else {
        guestRemove(productId, variantId);
      }
    },
    [isAuthenticated, invalidate, guestRemove]
  );

  const clear = useCallback(async () => {
    if (isAuthenticated) {
      try {
        await cartApi.clear();
      } finally {
        invalidate();
      }
    } else {
      guestClear();
    }
  }, [isAuthenticated, invalidate, guestClear]);

  return {
    cart,
    isLoading: isAuthenticated && backendQuery.isLoading,
    addItem,
    updateQuantity,
    removeItem,
    clear,
  };
}
