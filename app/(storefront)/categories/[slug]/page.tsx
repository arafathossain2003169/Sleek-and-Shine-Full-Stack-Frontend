import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { categoriesApi } from '@/lib/api/products';
import { isNotFound } from '@/lib/api/errors';
import { CatalogView } from '@/components/products/catalog-view';
import { ProductGridSkeleton } from '@/components/products/product-grid';

// Rendered per request so an unknown category is a real HTTP 404 (not a soft-404).
// The API response itself is cached for 60s via the fetch options in lib/api/products.ts.
export const dynamic = 'force-dynamic';

interface PageProps {
  params: { slug: string };
}

async function loadCategory(slug: string) {
  try {
    return (await categoriesApi.productsInCategory(slug, { limit: 1 })).data.category;
  } catch (err) {
    // Only a real 404 is "not found"; an API outage must surface as an error page.
    if (isNotFound(err)) notFound();
    throw err;
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  try {
    const category = (await categoriesApi.productsInCategory(params.slug, { limit: 1 })).data.category;
    return { title: category.name, description: category.description ?? `Shop ${category.name} at SleeknShine` };
  } catch {
    return { title: 'Category' };
  }
}

export default async function CategoryPage({ params }: PageProps) {
  const category = await loadCategory(params.slug);
  return (
    <Suspense fallback={<div className="container py-6"><ProductGridSkeleton count={12} /></div>}>
      <CatalogView categorySlug={params.slug} title={category.name} description={category.description} />
    </Suspense>
  );
}
