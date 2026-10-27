'use client';

import { Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Search as SearchIcon } from 'lucide-react';
import { useProductSearch } from '@/lib/hooks/useProducts';
import { ProductGrid, ProductGridSkeleton } from '@/components/products/product-grid';
import { EmptyState } from '@/components/shared/empty-state';
import { Pagination } from '@/components/shared/pagination';
import { QueryError } from '@/components/shared/query-error';

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="container py-16 text-center text-muted-foreground">Loading...</div>}>
      <SearchResults />
    </Suspense>
  );
}

/** Results only: the one search box lives in the header, so there is no second input here. */
function SearchResults() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const q = (searchParams.get('q') ?? '').trim();
  const page = Math.max(1, Number(searchParams.get('page')) || 1);

  const { data, isLoading, error, refetch } = useProductSearch(q, page);
  const total = Number(data?.meta?.total ?? 0);
  const totalPages = Number(data?.meta?.totalPages ?? 1);

  return (
    <div className="container py-6">
      {!q ? (
        <EmptyState icon={SearchIcon} title="Search for products" description="Type in the search box at the top of the page." />
      ) : q.length < 2 ? (
        <EmptyState icon={SearchIcon} title="Keep typing" description="Enter at least 2 characters to search." />
      ) : error && !data ? (
        <QueryError error={error} onRetry={() => refetch()} title="Search failed" />
      ) : (
        <>
          <h1 className="mb-1 font-display text-2xl font-semibold md:text-3xl">Results for “{q}”</h1>
          <p className="mb-4 text-sm text-muted-foreground" aria-live="polite">
            {isLoading ? 'Searching…' : `${total} product${total === 1 ? '' : 's'} found`}
          </p>
          {isLoading ? (
            <ProductGridSkeleton count={8} />
          ) : (
            <>
              <ProductGrid products={data?.data.products ?? []} />
              <Pagination
                page={page}
                totalPages={totalPages}
                onChange={(p) => router.push(`/search?q=${encodeURIComponent(q)}${p > 1 ? `&page=${p}` : ''}`)}
              />
            </>
          )}
        </>
      )}
    </div>
  );
}
