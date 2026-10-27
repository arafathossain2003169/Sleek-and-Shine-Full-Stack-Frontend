'use client';

import { useQuery } from '@tanstack/react-query';
import { adminApi } from '@/lib/api/admin';

/**
 * RULE: a React Query key must always hold ONE data shape. These three hooks own the keys
 * ['admin','categories'|'brands'|'attributes'] and return plain arrays; pages must use the hooks
 * (never their own useQuery with the same key but a different return shape).
 */

export function useAdminCategories() {
  return useQuery({
    queryKey: ['admin', 'categories'],
    queryFn: async () => (await adminApi.categories.list()).data.categories,
  });
}

export function useAdminBrands() {
  return useQuery({
    queryKey: ['admin', 'brands'],
    queryFn: async () => (await adminApi.brands.list()).data.brands,
  });
}

export function useAdminAttributes() {
  return useQuery({
    queryKey: ['admin', 'attributes'],
    queryFn: async () => (await adminApi.attributes.list()).data.attributes,
  });
}
