'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

/**
 * THE search box of the site (there is deliberately no second one on /search or /shop).
 * It is one form: inline in the header on desktop; on phones it appears as a bar under the header
 * when the search icon is tapped. It mirrors the current query when you are on /search.
 */
export function HeaderSearch({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const urlQuery = pathname === '/search' ? searchParams.get('q') ?? '' : '';
  const [query, setQuery] = useState(urlQuery);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => setQuery(urlQuery), [urlQuery]);
  useEffect(() => { if (open) inputRef.current?.focus(); }, [open]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const q = query.trim();
    if (q.length < 2) return;
    router.push(`/search?q=${encodeURIComponent(q)}`);
    onClose();
  }

  return (
    <form
      role="search"
      onSubmit={submit}
      className={cn(
        // phones: a bar under the header, only while open. md+: always inline in the header.
        'border-b border-border bg-background px-4 py-2 md:static md:block md:max-w-md md:flex-1 md:border-0 md:bg-transparent md:p-0',
        open ? 'absolute inset-x-0 top-16 block' : 'hidden'
      )}
    >
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          ref={inputRef}
          type="search"
          aria-label="Search products"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search products..."
          className="pl-9 pr-9"
          minLength={2}
        />
        <button
          type="button"
          onClick={onClose}
          aria-label="Close search"
          className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground md:hidden"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </form>
  );
}
