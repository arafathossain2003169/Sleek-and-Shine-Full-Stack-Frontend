'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { SlidersHorizontal, X } from 'lucide-react';
import { useBrands, useProducts } from '@/lib/hooks/useProducts';
import { ProductGrid, ProductGridSkeleton } from '@/components/products/product-grid';
import { activeFilterCount } from '@/components/products/sidebar-filters';
import { Pagination } from '@/components/shared/pagination';
import { QueryError } from '@/components/shared/query-error';
import { Button } from '@/components/ui/button';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { useUiStore } from '@/stores/ui.store';
import { SORT_OPTIONS } from '@/lib/constants';
import { formatCurrency } from '@/lib/utils';

interface CatalogViewProps {
  /** Set on /categories/[slug]; /shop shows every category. */
  categorySlug?: string;
  title?: string;
  description?: string | null;
}

/**
 * The product listing used by /shop and /categories/[slug].
 * Navigation (categories) and refinement (brand, price) live in the global sidebar and are
 * stored in the URL; this component only reads the URL and shows the results.
 */
export function CatalogView({ categorySlug, title, description }: CatalogViewProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const openDrawer = useUiStore((s) => s.openSidebarDrawer);
  const { data: brands } = useBrands();

  const page = Math.max(1, Number(searchParams.get('page')) || 1);
  const brand = searchParams.get('brand') ?? undefined;
  const minPrice = searchParams.get('minPrice') ?? undefined;
  const maxPrice = searchParams.get('maxPrice') ?? undefined;
  const sort = searchParams.get('sort') ?? 'newest';
  const isNewArrival = searchParams.get('isNewArrival') === 'true';
  const isOffer = searchParams.get('isOffer') === 'true';
  const isFeatured = searchParams.get('isFeatured') === 'true';

  const queryParams = useMemo(
    () => ({
      page,
      limit: 12,
      category: categorySlug,
      brand,
      minPrice: minPrice ? Number(minPrice) : undefined,
      maxPrice: maxPrice ? Number(maxPrice) : undefined,
      sort,
      isNewArrival: isNewArrival || undefined,
      isOffer: isOffer || undefined,
      isFeatured: isFeatured || undefined,
    }),
    [page, categorySlug, brand, minPrice, maxPrice, sort, isNewArrival, isOffer, isFeatured]
  );

  const { data, isLoading, error, refetch } = useProducts(queryParams);
  const total = Number(data?.meta?.total ?? 0);
  const totalPages = Number(data?.meta?.totalPages ?? 1);

  function update(next: Record<string, string | undefined>, opts: { keepPage?: boolean } = {}) {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(next).forEach(([k, v]) => (v ? params.set(k, v) : params.delete(k)));
    if (!opts.keepPage) params.delete('page');
    router.push(`${pathname}${params.toString() ? `?${params.toString()}` : ''}`, { scroll: false });
  }

  const heading =
    title ?? (isNewArrival ? 'New arrivals' : isOffer ? 'Offers' : isFeatured ? 'Featured' : 'Shop all products');
  const subtitle =
    description ??
    (categorySlug ? null : 'Browse the full catalogue. Pick a category on the left, then narrow by brand and price.');

  // removable chips for every active refinement
  const chips: { key: string; label: string; clear: Record<string, undefined> }[] = [];
  if (brand) chips.push({ key: 'brand', label: brands?.find((b) => b.slug === brand)?.name ?? brand, clear: { brand: undefined } });
  if (minPrice || maxPrice) {
    const label = minPrice && maxPrice ? `${formatCurrency(Number(minPrice))} – ${formatCurrency(Number(maxPrice))}`
      : minPrice ? `From ${formatCurrency(Number(minPrice))}` : `Up to ${formatCurrency(Number(maxPrice))}`;
    chips.push({ key: 'price', label, clear: { minPrice: undefined, maxPrice: undefined } as never });
  }
  if (isNewArrival) chips.push({ key: 'new', label: 'New arrivals', clear: { isNewArrival: undefined } });
  if (isOffer) chips.push({ key: 'offer', label: 'Offers', clear: { isOffer: undefined } });
  if (isFeatured) chips.push({ key: 'feat', label: 'Featured', clear: { isFeatured: undefined } });
  const filterCount = activeFilterCount(new URLSearchParams(searchParams.toString()));

  return (
    <div className="container py-6">
      <nav aria-label="Breadcrumb" className="mb-3 text-sm text-muted-foreground">
        <Link href="/" className="hover:text-foreground">Home</Link> /{' '}
        {categorySlug ? <Link href="/shop" className="hover:text-foreground">Shop</Link> : <span className="text-foreground">Shop</span>}
        {categorySlug && <> / <span className="text-foreground">{heading}</span></>}
      </nav>

      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold md:text-3xl">{heading}</h1>
          {subtitle && <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{subtitle}</p>}
        </div>
        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" size="sm" className="md:hidden" onClick={openDrawer}>
            <SlidersHorizontal className="mr-1.5 h-4 w-4" /> Filters{filterCount > 0 && ` (${filterCount})`}
          </Button>
          <Select value={sort} onValueChange={(v) => update({ sort: v === 'newest' ? undefined : v })}>
            <SelectTrigger className="w-44" aria-label="Sort products"><SelectValue placeholder="Sort by" /></SelectTrigger>
            <SelectContent>
              {SORT_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {chips.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-2" aria-label="Active filters">
          {chips.map((c) => (
            <button key={c.key} type="button" onClick={() => update(c.clear)}
              className="flex items-center gap-1 rounded-full border border-border bg-accent-soft px-3 py-1 text-xs hover:border-accent"
              aria-label={`Remove filter ${c.label}`}>
              {c.label} <X className="h-3 w-3" />
            </button>
          ))}
          <button type="button" className="text-xs text-muted-foreground underline"
            onClick={() => router.push(pathname, { scroll: false })}>Clear all</button>
        </div>
      )}

      {error && !data ? (
        <QueryError error={error} onRetry={() => refetch()} title="Could not load products" />
      ) : isLoading ? (
        <ProductGridSkeleton count={12} />
      ) : (
        <>
          <p className="mb-3 text-sm text-muted-foreground" aria-live="polite">{total} product{total === 1 ? '' : 's'}</p>
          <ProductGrid products={data?.data.products ?? []} />
          <Pagination
            page={page}
            totalPages={totalPages}
            onChange={(p) => { update({ page: p > 1 ? String(p) : undefined }, { keepPage: true }); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
          />
        </>
      )}
    </div>
  );
}
