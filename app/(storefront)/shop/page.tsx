import { Suspense } from 'react';
import type { Metadata } from 'next';
import { CatalogView } from '@/components/products/catalog-view';
import { ProductGridSkeleton } from '@/components/products/product-grid';

export const metadata: Metadata = {
  title: 'Shop all products',
  description: 'Browse the full SleeknShine catalogue: filter by category, brand and price.',
};

/** /shop = the full catalogue. (The home page `/` is the curated landing page.) */
export default function ShopPage() {
  return (
    <Suspense fallback={<div className="container py-6"><ProductGridSkeleton count={12} /></div>}>
      <CatalogView />
    </Suspense>
  );
}
