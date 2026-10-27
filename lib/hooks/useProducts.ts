'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { productsApi, ProductListParams, brandsApi, categoriesApi, searchApi } from '@/lib/api/products';

export function useProducts(params: ProductListParams) {
  return useQuery({
    queryKey: ['products', params],
    queryFn: () => productsApi.list(params),
    staleTime: 30_000,
    // keep showing the previous page while the next one loads (no skeleton flash on every click)
    placeholderData: keepPreviousData,
  });
}

export function useProductSearch(q: string, page: number) {
  return useQuery({
    queryKey: ['search', q, page],
    queryFn: () => searchApi.search(q, { page, limit: 12 }),
    enabled: q.trim().length >= 2,
    placeholderData: keepPreviousData,
  });
}

export function useBrands() {
  return useQuery({
    queryKey: ['brands'],
    queryFn: async () => (await brandsApi.list()).data.brands,
    staleTime: 5 * 60_000,
  });
}

export function useCategories() {
  return useQuery({
    queryKey: ['categories', 'flat'],
    queryFn: async () => (await categoriesApi.list()).data.categories,
    staleTime: 5 * 60_000,
  });
}
