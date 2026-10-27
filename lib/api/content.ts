import { apiClient } from './client';
import { ProductSummary, CategoryTreeNode } from '@/types/product';

export interface HomepageSection {
  id: string;
  type: 'hero' | 'banner' | 'offer' | 'new_arrival' | 'featured_category' | 'custom';
  title: string;
  subtitle?: string | null;
  image_url?: string | null;
  button_text?: string | null;
  button_link?: string | null;
  data: Record<string, unknown>;
  sort_order: number;
}

export interface HomepageContent {
  sections: HomepageSection[];
  newArrivals: ProductSummary[];
  offers: ProductSummary[];
  featured: ProductSummary[];
  categories: CategoryTreeNode[];
}

export const contentApi = {
  // 60s data cache: dynamic page, but not one API round-trip per visitor.
  homepage: () => apiClient.get<HomepageContent>('/content/homepage', { next: { revalidate: 60 } }),
};
