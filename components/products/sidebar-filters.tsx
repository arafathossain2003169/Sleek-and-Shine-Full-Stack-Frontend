'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useBrands } from '@/lib/hooks/useProducts';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';

/** Filters that only exist on catalog pages (/shop and /categories/*). */
export const FILTER_PARAMS = ['brand', 'minPrice', 'maxPrice'] as const;

export function isCatalogPath(pathname: string) {
  return pathname === '/shop' || pathname.startsWith('/categories/');
}

export function activeFilterCount(params: URLSearchParams) {
  return FILTER_PARAMS.filter((k) => params.get(k)).length;
}

/** Price inputs commit after a pause instead of on every keystroke. */
function PriceRange({ min, max, onCommit }: { min?: string; max?: string; onCommit: (min?: string, max?: string) => void }) {
  const [lo, setLo] = useState(min ?? '');
  const [hi, setHi] = useState(max ?? '');
  const first = useRef(true);

  useEffect(() => { setLo(min ?? ''); setHi(max ?? ''); }, [min, max]);

  useEffect(() => {
    if (first.current) { first.current = false; return; }
    if ((lo || undefined) === min && (hi || undefined) === max) return;
    if (lo !== '' && hi !== '' && Number(lo) > Number(hi)) return; // wait until the range is valid
    const t = setTimeout(() => onCommit(lo || undefined, hi || undefined), 600);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lo, hi]);

  const invalid = lo !== '' && hi !== '' && Number(lo) > Number(hi);
  return (
    <div>
      <div className="flex items-center gap-2">
        <div className="flex-1">
          <Label htmlFor="sf-min" className="sr-only">Minimum price</Label>
          <Input id="sf-min" type="number" min={0} inputMode="decimal" placeholder="Min" value={lo} onChange={(e) => setLo(e.target.value)} error={invalid} />
        </div>
        <span className="text-muted-foreground">–</span>
        <div className="flex-1">
          <Label htmlFor="sf-max" className="sr-only">Maximum price</Label>
          <Input id="sf-max" type="number" min={0} inputMode="decimal" placeholder="Max" value={hi} onChange={(e) => setHi(e.target.value)} error={invalid} />
        </div>
      </div>
      {invalid && <p className="mt-1 text-xs text-destructive">Min is higher than max.</p>}
    </div>
  );
}

/** Reads and writes the URL, so the sidebar and the product grid always agree. */
export function SidebarFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { data: brands } = useBrands();

  function update(next: Record<string, string | undefined>, replace = false) {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(next).forEach(([k, v]) => (v ? params.set(k, v) : params.delete(k)));
    params.delete('page'); // any filter change starts again at page 1
    const url = `${pathname}${params.toString() ? `?${params.toString()}` : ''}`;
    if (replace) router.replace(url, { scroll: false });
    else router.push(url, { scroll: false });
  }

  const brand = searchParams.get('brand') ?? undefined;
  const count = activeFilterCount(new URLSearchParams(searchParams.toString()));

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Brand</h3>
        <div className="flex flex-col gap-2">
          {brands?.map((b) => (
            <label key={b.id} className="flex cursor-pointer items-center gap-2 text-sm">
              <Checkbox checked={brand === b.slug} onCheckedChange={(c) => update({ brand: c ? b.slug : undefined })} />
              {b.name}
            </label>
          ))}
          {brands && brands.length === 0 && <p className="text-sm text-muted-foreground">No brands yet.</p>}
        </div>
      </div>

      <div>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Price</h3>
        <PriceRange
          min={searchParams.get('minPrice') ?? undefined}
          max={searchParams.get('maxPrice') ?? undefined}
          onCommit={(minPrice, maxPrice) => update({ minPrice, maxPrice }, true)}
        />
      </div>

      {count > 0 && (
        <Button type="button" variant="outline" size="sm" onClick={() => update({ brand: undefined, minPrice: undefined, maxPrice: undefined })}>
          Clear filters ({count})
        </Button>
      )}
    </div>
  );
}
