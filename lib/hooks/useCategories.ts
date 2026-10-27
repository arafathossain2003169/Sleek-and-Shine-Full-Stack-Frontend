'use client';

import { useQuery } from '@tanstack/react-query';
import { categoriesApi } from '@/lib/api/products';

export function useCategoryTree() {
  return useQuery({
    queryKey: ['categories', 'tree'],
    queryFn: async () => (await categoriesApi.tree()).data.categories,
    staleTime: 5 * 60_000,
  });
}
