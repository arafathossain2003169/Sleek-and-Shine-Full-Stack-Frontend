import { apiClient } from './client';
import { ProductDetail, ProductSummary, CategoryTreeNode, Category, Brand } from '@/types/product';

export interface ProductListParams {
  page?: number;
  limit?: number;
  search?: string;
  category?: string;
  brand?: string;
  minPrice?: number;
  maxPrice?: number;
  sort?: string;
  isNewArrival?: boolean;
  isOffer?: boolean;
  isFeatured?: boolean;
}

function toQueryString(params: Record<string, unknown> | ProductListParams): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue;
    search.set(key, String(value));
  }
  const qs = search.toString();
  return qs ? `?${qs}` : '';
}

export const productsApi = {
  list: (params: ProductListParams = {}) =>
    apiClient.get<{ products: ProductSummary[] }>(`/products${toQueryString(params)}`),

  // `next.revalidate`: used by the server-rendered pages so price/stock edits show up within a minute
  getBySlug: (slug: string) =>
    apiClient.get<{ product: ProductDetail }>(`/products/${slug}`, { next: { revalidate: 60 } }),

  related: (slug: string) =>
    apiClient.get<{ products: ProductSummary[] }>(`/products/${slug}/related`, { next: { revalidate: 60 } }),
};

export const categoriesApi = {
  list: () => apiClient.get<{ categories: Category[] }>('/categories'),
  tree: () => apiClient.get<{ categories: CategoryTreeNode[] }>('/categories/tree'),
  productsInCategory: (slug: string, params: { page?: number; limit?: number } = {}) =>
    apiClient.get<{ category: Category; products: ProductSummary[] }>(
      `/categories/${slug}/products${toQueryString(params)}`,
      { next: { revalidate: 60 } }
    ),
};

export const brandsApi = {
  list: () => apiClient.get<{ brands: Brand[] }>('/brands'),
  productsForBrand: (slug: string, params: { page?: number; limit?: number } = {}) =>
    apiClient.get<{ brand: Brand; products: ProductSummary[] }>(
      `/brands/${slug}/products${toQueryString(params)}`
    ),
};

export const searchApi = {
  search: (q: string, params: { page?: number; limit?: number } = {}) =>
    apiClient.get<{ products: ProductSummary[]; query: string }>(
      `/search${toQueryString({ q, ...params })}`
    ),
};
