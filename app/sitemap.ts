import type { MetadataRoute } from 'next';
import { categoriesApi, productsApi } from '@/lib/api/products';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

// Generated per request (not frozen at build time, when the API may be unreachable); the crawler hits it rarely.
export const dynamic = 'force-dynamic';

/** Static pages + every category + the newest published products. Falls back gracefully if the API is down. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = [
    { url: SITE_URL, changeFrequency: 'daily', priority: 1 },
    { url: `${SITE_URL}/shop`, changeFrequency: 'daily', priority: 0.9 },
  ];
  try {
    const { data } = await categoriesApi.list();
    entries.push(...data.categories.map((c) => ({ url: `${SITE_URL}/categories/${c.slug}`, changeFrequency: 'weekly' as const, priority: 0.7 })));
  } catch {
    /* sitemap still useful without categories */
  }
  try {
    for (let page = 1; page <= 10; page++) {
      const res = await productsApi.list({ page, limit: 100 });
      entries.push(...res.data.products.map((p) => ({ url: `${SITE_URL}/products/${p.slug}`, changeFrequency: 'weekly' as const, priority: 0.8 })));
      if (page >= Number(res.meta?.totalPages ?? 1)) break;
    }
  } catch {
    /* ignore */
  }
  return entries;
}
